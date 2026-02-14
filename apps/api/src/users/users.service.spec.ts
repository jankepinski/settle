import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const user = { id: 'user-1', email: 'a@b.com', isGuest: false };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = { id: 'user-1', email: 'a@b.com', isGuest: false };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('a@b.com');

      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
    });

    it('should return null for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createGuest', () => {
    it('should create user with isGuest=true and no email', async () => {
      const guest = { id: 'guest-1', email: null, isGuest: true };
      prisma.user.create.mockResolvedValue(guest);

      const result = await service.createGuest();

      expect(result).toEqual(guest);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { isGuest: true },
      });
    });
  });

  describe('upgradeGuest', () => {
    it('should set email, passwordHash, isGuest=false', async () => {
      const guest = { id: 'guest-1', email: null, isGuest: true };
      const upgraded = {
        id: 'guest-1',
        email: 'a@b.com',
        passwordHash: 'hashed',
        isGuest: false,
      };

      prisma.user.findUnique
        .mockResolvedValueOnce(guest) // find the guest
        .mockResolvedValueOnce(null); // email not taken
      prisma.user.update.mockResolvedValue(upgraded);

      const result = await service.upgradeGuest('guest-1', {
        email: 'a@b.com',
        passwordHash: 'hashed',
      });

      expect(result).toEqual(upgraded);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'guest-1' },
        data: {
          email: 'a@b.com',
          passwordHash: 'hashed',
          displayName: undefined,
          isGuest: false,
        },
      });
    });

    it('should throw BadRequestException when user is not a guest', async () => {
      const registered = { id: 'user-1', email: 'a@b.com', isGuest: false };
      prisma.user.findUnique.mockResolvedValue(registered);

      await expect(
        service.upgradeGuest('user-1', {
          email: 'new@b.com',
          passwordHash: 'hashed',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when email already exists', async () => {
      const guest = { id: 'guest-1', email: null, isGuest: true };
      const existing = { id: 'user-2', email: 'taken@b.com' };

      prisma.user.findUnique
        .mockResolvedValueOnce(guest) // find the guest
        .mockResolvedValueOnce(existing); // email taken

      await expect(
        service.upgradeGuest('guest-1', {
          email: 'taken@b.com',
          passwordHash: 'hashed',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createRegistered', () => {
    it('should create a non-guest user', async () => {
      const user = {
        id: 'user-1',
        email: 'a@b.com',
        isGuest: false,
      };

      prisma.user.findUnique.mockResolvedValue(null); // email not taken
      prisma.user.create.mockResolvedValue(user);

      const result = await service.createRegistered({
        email: 'a@b.com',
        passwordHash: 'hashed',
      });

      expect(result).toEqual(user);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@b.com',
          passwordHash: 'hashed',
          displayName: undefined,
          isGuest: false,
        },
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createRegistered({
          email: 'taken@b.com',
          passwordHash: 'hashed',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
