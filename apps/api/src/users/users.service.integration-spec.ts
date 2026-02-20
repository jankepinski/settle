import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  getTestPrisma,
  truncateTables,
  disconnectTestDb,
} from '../../test/helpers/test-db';

/**
 * Integration tests for UsersService — invite code & lastActiveAt fields.
 *
 * These tests use a real PostgreSQL database (test container on port 5433).
 * Each test starts with clean tables.
 *
 * Run: pnpm test:integration  (requires `pnpm db:test:up` first)
 */
describe('UsersService (integration) — invite code & lastActiveAt', () => {
  let usersService: UsersService;
  let prisma: ReturnType<typeof getTestPrisma>;

  beforeAll(async () => {
    prisma = getTestPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  beforeEach(async () => {
    await truncateTables();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('createGuest()', () => {
    it('persists inviteCode in the database', async () => {
      const user = await usersService.createGuest();

      expect(user.inviteCode).toBeDefined();
      expect(user.inviteCode).toHaveLength(6);
      expect(user.inviteCode).toMatch(/^[A-Z0-9]{6}$/);

      const persisted = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(persisted?.inviteCode).toBe(user.inviteCode);
    });

    it('sets lastActiveAt to approximately now on creation', async () => {
      const before = new Date();
      const user = await usersService.createGuest();
      const after = new Date();

      expect(user.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(user.lastActiveAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000,
      );
    });

    it('inviteCode is unique across two different users', async () => {
      const user1 = await usersService.createGuest();
      const user2 = await usersService.createGuest();

      expect(user1.inviteCode).not.toBe(user2.inviteCode);
    });
  });

  describe('createGuest() — collision retry', () => {
    it('succeeds when first generated code collides with an existing user', async () => {
      // Pre-create a user with a known invite code to force a collision
      const existingUser = await usersService.createGuest();
      const takenCode = existingUser.inviteCode;

      // Wrap the real prisma to intercept the first findUnique for inviteCode
      // and make it appear as a collision, then fall through to real DB on second call.
      let findUniqueCallCount = 0;
      const originalFindUnique = prisma.user.findUnique.bind(prisma.user);
      const spy = jest
        .spyOn(prisma.user, 'findUnique')
        .mockImplementation((args: any) => {
          if (args?.where?.inviteCode) {
            findUniqueCallCount++;
            if (findUniqueCallCount === 1) {
              // Simulate: first randomly generated code == takenCode
              return Promise.resolve({ id: existingUser.id }) as any;
            }
          }
          return originalFindUnique(args);
        });

      const newUser = await usersService.createGuest();
      spy.mockRestore();

      expect(findUniqueCallCount).toBeGreaterThanOrEqual(1);
      expect(newUser.inviteCode).not.toBe(takenCode);
      expect(newUser.inviteCode).toMatch(/^[A-Z0-9]{6}$/);

      const allUsers = await prisma.user.findMany();
      expect(allUsers).toHaveLength(2);
    });
  });

  describe('createRegistered()', () => {
    it('persists inviteCode in the database', async () => {
      const user = await usersService.createRegistered({
        email: 'reg@example.com',
        passwordHash: 'hashed',
      });

      expect(user.inviteCode).toBeDefined();
      expect(user.inviteCode).toHaveLength(6);
      expect(user.inviteCode).toMatch(/^[A-Z0-9]{6}$/);

      const persisted = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(persisted?.inviteCode).toBe(user.inviteCode);
    });

    it('sets lastActiveAt to approximately now on creation', async () => {
      const before = new Date();
      const user = await usersService.createRegistered({
        email: 'time@example.com',
        passwordHash: 'hashed',
      });
      const after = new Date();

      expect(user.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(user.lastActiveAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000,
      );
    });

    it('inviteCode is unique across guest and registered user', async () => {
      const guest = await usersService.createGuest();
      const registered = await usersService.createRegistered({
        email: 'unique@example.com',
        passwordHash: 'hashed',
      });

      expect(guest.inviteCode).not.toBe(registered.inviteCode);
    });
  });
});
