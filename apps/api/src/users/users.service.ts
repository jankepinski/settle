import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by their unique ID.
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Find a user by email. Returns null when not found or when email is null
   * (guest users).
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Create a new guest user — no email, no password, isGuest = true.
   */
  async createGuest() {
    return this.prisma.user.create({ data: { isGuest: true } });
  }

  /**
   * Upgrade a guest account to a registered account.
   * Sets email, passwordHash, and flips isGuest to false.
   *
   * Throws BadRequestException if the user is not a guest.
   * Throws ConflictException if the email is already taken.
   */
  async upgradeGuest(
    userId: string,
    data: { email: string; passwordHash: string; displayName?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isGuest) {
      throw new BadRequestException('User is not a guest');
    }

    // Check for email uniqueness before updating
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        isGuest: false,
      },
    });
  }

  /**
   * Create a brand-new registered user (not from a guest).
   *
   * Throws ConflictException if the email is already taken.
   */
  async createRegistered(data: {
    email: string;
    passwordHash: string;
    displayName?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        isGuest: false,
      },
    });
  }
}
