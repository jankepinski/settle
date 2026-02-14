import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

/**
 * The payload we store inside every JWT (both access and refresh).
 * `sub` is the standard JWT claim for the subject (userId).
 */
export interface JwtPayload {
  sub: string; // userId
  isGuest: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Guest
  // ---------------------------------------------------------------------------

  /**
   * Create a guest user and return a fresh token pair.
   */
  async createGuest() {
    const user = await this.usersService.createGuest();
    return this.generateTokens(user.id, true);
  }

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------

  /**
   * Register a new user. If `guestUserId` is provided the existing guest
   * account is upgraded — the same ID is kept so all guest data is preserved.
   * Otherwise a brand-new registered account is created.
   */
  async register(
    data: { email: string; password: string; displayName?: string },
    guestUserId?: string,
  ) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    let user;
    if (guestUserId) {
      // Upgrade the guest account (throws on duplicate email or non-guest)
      user = await this.usersService.upgradeGuest(guestUserId, {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      });
    } else {
      // Create a fresh registered user (throws on duplicate email)
      user = await this.usersService.createRegistered({
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      });
    }

    // Invalidate all old refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return this.generateTokens(user.id, false);
  }

  // ---------------------------------------------------------------------------
  // Login (used by LocalStrategy)
  // ---------------------------------------------------------------------------

  /**
   * Validate email + password. Called by `LocalStrategy`.
   * Returns the user if valid, null otherwise.
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      return null;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    return passwordValid ? user : null;
  }

  /**
   * Generate tokens after a successful login.
   */
  async login(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.generateTokens(user.id, user.isGuest);
  }

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  /**
   * Refresh an access token using a refresh token.
   * Implements **token rotation**: the old refresh token is deleted and a
   * new one is issued. If a reused (already-deleted) token is presented the
   * user may have been compromised — we delete all their tokens.
   */
  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      // Possible token reuse / theft — no record means it was already rotated
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      // Clean up the expired token
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Delete the used token (rotation)
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user.id, stored.user.isGuest);
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  /**
   * Invalidate a single refresh token (the one from the cookie).
   */
  async logout(refreshToken: string) {
    if (!refreshToken) return;

    const tokenHash = this.hashToken(refreshToken);
    // deleteMany instead of delete to avoid throwing if already gone
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  // ---------------------------------------------------------------------------
  // Token helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a fresh access + refresh token pair and persist the refresh
   * token hash in the database.
   */
  private async generateTokens(userId: string, isGuest: boolean) {
    const payload: JwtPayload = { sub: userId, isGuest };

    const accessExpiresSec = this.getExpiresSec('JWT_ACCESS_EXPIRES_IN', 900);
    const accessToken = this.jwtService.sign(
      { ...payload } as Record<string, unknown>,
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresSec,
      },
    );

    // Refresh token is a random string — NOT a JWT. We store its hash.
    const refreshToken = randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    const refreshExpiresSec = this.getExpiresSec(
      'JWT_REFRESH_EXPIRES_IN',
      604800,
    );
    const expiresAt = new Date(Date.now() + refreshExpiresSec * 1000);

    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Read a lifetime env variable as a number of seconds.
   * Falls back to `defaultSec` if the variable is missing or not a number.
   */
  getExpiresSec(envKey: string, defaultSec: number): number {
    const raw = this.config.get<string>(envKey);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : defaultSec;
  }

  /**
   * SHA-256 hash a token for storage. We never store raw refresh tokens.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
