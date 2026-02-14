import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  getTestPrisma,
  truncateTables,
  disconnectTestDb,
} from '../../test/helpers/test-db';
import {
  createTestGuestUser,
  createTestRegisteredUser,
} from '../../test/helpers/test-fixtures';

/**
 * Integration tests for AuthService.
 *
 * These tests use a real PostgreSQL database (test container on port 5433).
 * Each test starts with clean tables.
 *
 * Run: pnpm test:integration  (requires `pnpm db:test:up` first)
 */
describe('AuthService (integration)', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let prisma: ReturnType<typeof getTestPrisma>;

  beforeAll(async () => {
    prisma = getTestPrisma();

    // Create a NestJS testing module with real services but the test DB
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        UsersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'integration-test-access-secret',
                JWT_REFRESH_SECRET: 'integration-test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '900',
                JWT_REFRESH_EXPIRES_IN: '604800',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  beforeEach(async () => {
    await truncateTables();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('should create guest user and persist refresh token in DB', async () => {
    const tokens = await authService.createGuest();

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    // Verify user was created
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].isGuest).toBe(true);
    expect(users[0].email).toBeNull();

    // Verify refresh token was persisted
    const storedTokens = await prisma.refreshToken.findMany();
    expect(storedTokens).toHaveLength(1);
    expect(storedTokens[0].userId).toBe(users[0].id);

    // Verify hash matches
    const expectedHash = createHash('sha256')
      .update(tokens.refreshToken)
      .digest('hex');
    expect(storedTokens[0].tokenHash).toBe(expectedHash);
  });

  it('should register user - upgrade guest and persist changes', async () => {
    // Create a guest first
    const guest = await createTestGuestUser(prisma as any);

    const tokens = await authService.register(
      { email: 'new@example.com', password: 'password123' },
      guest.id,
    );

    expect(tokens.accessToken).toBeDefined();

    // Verify the same user was upgraded (not a new one)
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(guest.id);
    expect(users[0].isGuest).toBe(false);
    expect(users[0].email).toBe('new@example.com');
    expect(users[0].passwordHash).toBeDefined();

    // Verify password was properly hashed
    const passwordValid = await bcrypt.compare(
      'password123',
      users[0].passwordHash!,
    );
    expect(passwordValid).toBe(true);
  });

  it('should register user - create new when no guest', async () => {
    const tokens = await authService.register({
      email: 'brand@new.com',
      password: 'password123',
    });

    expect(tokens.accessToken).toBeDefined();

    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].isGuest).toBe(false);
    expect(users[0].email).toBe('brand@new.com');
  });

  it('should reject duplicate email registration', async () => {
    await createTestRegisteredUser(prisma as any, {
      email: 'taken@example.com',
    });

    await expect(
      authService.register({
        email: 'taken@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should login and create new refresh token', async () => {
    // First register a user
    await authService.register({
      email: 'login@test.com',
      password: 'password123',
    });

    // Validate and get user
    const user = await authService.validateUser('login@test.com', 'password123');
    expect(user).toBeDefined();

    // Login
    const tokens = await authService.login(user!.id);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    // Should have a refresh token stored
    const storedTokens = await prisma.refreshToken.findMany({
      where: { userId: user!.id },
    });
    expect(storedTokens.length).toBeGreaterThanOrEqual(1);
  });

  it('should rotate refresh token (old deleted, new created)', async () => {
    const guestTokens = await authService.createGuest();

    // Count tokens before refresh
    const before = await prisma.refreshToken.findMany();
    expect(before).toHaveLength(1);

    // Refresh
    const newTokens = await authService.refreshTokens(
      guestTokens.refreshToken,
    );

    // Old token should be gone, new one should exist
    const after = await prisma.refreshToken.findMany();
    expect(after).toHaveLength(1);

    // The token hash should be different
    const oldHash = createHash('sha256')
      .update(guestTokens.refreshToken)
      .digest('hex');
    const newHash = createHash('sha256')
      .update(newTokens.refreshToken)
      .digest('hex');
    expect(after[0].tokenHash).toBe(newHash);
    expect(after[0].tokenHash).not.toBe(oldHash);
  });

  it('should logout and remove refresh token from DB', async () => {
    const tokens = await authService.createGuest();

    // Verify token exists
    const before = await prisma.refreshToken.findMany();
    expect(before).toHaveLength(1);

    // Logout
    await authService.logout(tokens.refreshToken);

    // Token should be gone
    const after = await prisma.refreshToken.findMany();
    expect(after).toHaveLength(0);
  });
});
