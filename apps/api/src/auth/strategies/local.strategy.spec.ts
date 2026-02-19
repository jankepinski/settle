import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: { validateUser: jest.Mock };

  beforeEach(async () => {
    authService = { validateUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  describe('validate', () => {
    it('should return user for valid email+password', async () => {
      const user = { id: 'user-1', email: 'a@b.com' };
      authService.validateUser.mockResolvedValue(user);

      const result = await strategy.validate('a@b.com', 'password123');

      expect(result).toEqual(user);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'a@b.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException when validateUser returns null', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('a@b.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
