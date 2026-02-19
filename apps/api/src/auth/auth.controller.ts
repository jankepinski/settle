import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Cookie configuration for the refresh token
const REFRESH_COOKIE_NAME = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /auth/guest
   *
   * Create a guest user and return tokens. No authentication required.
   * The frontend calls this on the user's first meaningful action
   * (e.g. creating a group, adding an expense).
   */
  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  async createGuest(@Res({ passthrough: true }) res: any) {
    const tokens = await this.authService.createGuest();
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /**
   * POST /auth/register
   *
   * Register a new user with email + password. If the request includes a
   * valid access token for a guest user, the guest account is upgraded
   * (keeping the same userId and all associated data).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    // Try to extract guest userId from an optional Bearer token
    const guestUserId = this.extractGuestUserId(req);

    const tokens = await this.authService.register(
      {
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
      },
      guestUserId,
    );

    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /**
   * POST /auth/login
   *
   * Log in with email + password. The LocalAuthGuard + LocalStrategy handle
   * credential validation before the handler runs. By the time we get here,
   * req.user is already the authenticated user.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const user = req.user as { id: string };
    const tokens = await this.authService.login(user.id);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /**
   * POST /auth/refresh
   *
   * Exchange a valid refresh token (from the httpOnly cookie) for a new
   * access + refresh token pair. Implements token rotation.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  /**
   * POST /auth/logout
   *
   * Invalidate the refresh token and clear the cookie. Requires a valid
   * access token.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME);
    return { message: 'Logged out' };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Set the refresh token as an httpOnly cookie.
   * httpOnly: JS cannot read it (XSS protection)
   * secure: only sent over HTTPS (disabled in dev)
   * sameSite: 'lax' for CSRF protection
   */
  private setRefreshCookie(res: Response, token: string) {
    const refreshExpiresSec = this.authService.getExpiresSec(
      'JWT_REFRESH_EXPIRES_IN',
      604800,
    );
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: refreshExpiresSec * 1000,
    });
  }

  /**
   * Try to extract a guest userId from the Authorization header.
   * This is an *optional* extraction — if there's no token or it's invalid,
   * we simply return undefined (the user will be created fresh).
   */
  private extractGuestUserId(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return undefined;

    try {
      const token = authHeader.split(' ')[1];
      const payload = this.authService['jwtService'].verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      // Only upgrade if the token belongs to a guest
      if (payload.isGuest) {
        return payload.sub;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}
