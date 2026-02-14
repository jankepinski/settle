import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock bcrypt at module level
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    createGuest: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    upgradeGuest: jest.Mock;
    createRegistered: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    usersService = {
      createGuest: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      upgradeGuest: jest.fn(),
      createRegistered: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
      verify: jest.fn(),
    };

    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_EXPIRES_IN: '900',
          JWT_REFRESH_EXPIRES_IN: '604800',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('createGuest', () => {
    it('should create a guest user with isGuest=true', async () => {
      usersService.createGuest.mockResolvedValue({
        id: 'guest-1',
        isGuest: true,
      });

      await service.createGuest();

      expect(usersService.createGuest).toHaveBeenCalled();
    });

    it('should return access token and refresh token', async () => {
      usersService.createGuest.mockResolvedValue({
        id: 'guest-1',
        isGuest: true,
      });

      const result = await service.createGuest();

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should store hashed refresh token in DB', async () => {
      usersService.createGuest.mockResolvedValue({
        id: 'guest-1',
        isGuest: true,
      });

      const result = await service.createGuest();

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'guest-1',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });

      // Verify the stored hash matches the returned token
      const expectedHash = createHash('sha256')
        .update(result.refreshToken)
        .digest('hex');
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tokenHash: expectedHash }),
      });
    });
  });

  describe('register', () => {
    it('should upgrade guest to registered user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.upgradeGuest.mockResolvedValue({
        id: 'guest-1',
        email: 'a@b.com',
        isGuest: false,
      });

      const result = await service.register(
        { email: 'a@b.com', password: 'password123' },
        'guest-1',
      );

      expect(usersService.upgradeGuest).toHaveBeenCalledWith('guest-1', {
        email: 'a@b.com',
        passwordHash: 'hashed-password',
        displayName: undefined,
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should create new user when no guest token provided', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.createRegistered.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        isGuest: false,
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(usersService.createRegistered).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hashed-password',
        displayName: undefined,
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should hash password with bcrypt before saving', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.createRegistered.mockResolvedValue({
        id: 'user-1',
        isGuest: false,
      });

      await service.register({ email: 'a@b.com', password: 'mypassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
    });

    it('should invalidate old refresh tokens after registration', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.createRegistered.mockResolvedValue({
        id: 'user-1',
        isGuest: false,
      });

      await service.register({ email: 'a@b.com', password: 'password123' });

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return new token pair', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      usersService.createRegistered.mockResolvedValue({
        id: 'user-1',
        isGuest: false,
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('validateUser', () => {
    it('should return user object for valid credentials', async () => {
      const user = {
        id: 'user-1',
        email: 'a@b.com',
        passwordHash: 'hashed',
      };
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('a@b.com', 'password123');

      expect(result).toEqual(user);
    });

    it('should return null for invalid credentials', async () => {
      const user = {
        id: 'user-1',
        email: 'a@b.com',
        passwordHash: 'hashed',
      };
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('a@b.com', 'wrong');

      expect(result).toBeNull();
    });

    it('should return null for non-existent email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nobody@b.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for guest accounts (no passwordHash)', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'guest-1',
        email: null,
        passwordHash: null,
      });

      const result = await service.validateUser('guest@b.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens for valid user', async () => {
      usersService.findById.mockResolvedValue({
        id: 'user-1',
        isGuest: false,
      });

      const result = await service.login('user-1');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.login('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new token pair for valid refresh token', async () => {
      const tokenHash = createHash('sha256')
        .update('valid-refresh-token')
        .digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 'user-1', isGuest: false },
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should invalidate old refresh token (rotation)', async () => {
      const tokenHash = createHash('sha256')
        .update('old-token')
        .digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 'user-1', isGuest: false },
      });

      await service.refreshTokens('old-token');

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      });
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const tokenHash = createHash('sha256')
        .update('expired-token')
        .digest('hex');
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash,
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 60000), // expired
        user: { id: 'user-1', isGuest: false },
      });

      await expect(
        service.refreshTokens('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for reused (already invalidated) token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('reused-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token from DB', async () => {
      const tokenHash = createHash('sha256')
        .update('logout-token')
        .digest('hex');

      await service.logout('logout-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash },
      });
    });

    it('should not throw when token is empty', async () => {
      await expect(service.logout('')).resolves.not.toThrow();
    });
  });
});
