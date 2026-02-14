import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

/**
 * JwtStrategy — validates access tokens.
 *
 * How it works:
 * 1. Passport extracts the JWT from the Authorization header (Bearer scheme).
 * 2. It verifies the signature using JWT_ACCESS_SECRET.
 * 3. If valid, it calls `validate()` with the decoded payload.
 * 4. The returned value is attached to `req.user`.
 *
 * If the token is expired or the signature is wrong, Passport automatically
 * returns 401 before `validate()` is ever called.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called after the JWT signature is verified. We look up the user in the
   * database to make sure they still exist (e.g. weren't deleted).
   */
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // This object becomes `req.user`
    return { id: user.id, email: user.email, isGuest: user.isGuest };
  }
}
