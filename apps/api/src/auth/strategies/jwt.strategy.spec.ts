import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    usersService = { findById: jest.fn() };

    const config = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user payload from valid JWT payload', async () => {
      const user = { id: 'user-1', email: 'a@b.com', isGuest: false };
      usersService.findById.mockResolvedValue(user);

      const result = await strategy.validate({ sub: 'user-1', isGuest: false });

      expect(result).toEqual({
        id: 'user-1',
        email: 'a@b.com',
        isGuest: false,
      });
      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException when user not found in DB', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'nonexistent', isGuest: false }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
