import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * LocalStrategy — validates email + password for the login endpoint.
 *
 * How it works:
 * 1. Passport reads `username` and `password` from the request body.
 *    We override `usernameField` to `email` so it reads `email` instead.
 * 2. It calls `validate()` with the extracted values.
 * 3. If `validate()` returns a user, it's attached to `req.user`.
 * 4. If it throws, Passport returns 401.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }
}
