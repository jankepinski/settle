import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { randomCode } from '../../src/users/invite-code.util';

/**
 * Factory functions for creating test data in the database.
 *
 * Each function takes the test PrismaClient and optional overrides,
 * creates a record in the DB, and returns it.
 */

export async function createTestGuestUser(
  prisma: PrismaClient,
  overrides: { id?: string; inviteCode?: string } = {},
) {
  return prisma.user.create({
    data: {
      isGuest: true,
      inviteCode: overrides.inviteCode ?? randomCode(),
      ...overrides,
    },
  });
}

export async function createTestRegisteredUser(
  prisma: PrismaClient,
  overrides: {
    email?: string;
    password?: string;
    displayName?: string;
    inviteCode?: string;
  } = {},
) {
  const email = overrides.email ?? 'test@example.com';
  const passwordHash = await bcrypt.hash(overrides.password ?? 'password123', 10);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: overrides.displayName ?? 'Test User',
      inviteCode: overrides.inviteCode ?? randomCode(),
      isGuest: false,
    },
  });
}

export async function createTestRefreshToken(
  prisma: PrismaClient,
  userId: string,
  tokenHash: string,
  overrides: { expiresAt?: Date } = {},
) {
  return prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}
