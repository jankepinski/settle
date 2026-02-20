import * as crypto from 'crypto';
import type { PrismaClient } from '../generated/prisma/client';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

/**
 * Generate a random 6-character invite code from A-Z and 0-9.
 * Retries on uniqueness constraint violations (Prisma error P2002).
 */
export async function generateInviteCode(
  prisma: PrismaClient,
  maxRetries = 5,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const code = randomCode();
    const existing = await prisma.user.findUnique({
      where: { inviteCode: code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error(
    `Failed to generate unique invite code after ${maxRetries + 1} attempts`,
  );
}

export function randomCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}
