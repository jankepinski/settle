import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

let prisma: PrismaClient;

/**
 * Get or create a PrismaClient instance connected to the test database.
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

/**
 * Run Prisma migrations against the test database.
 * Call this once before all tests in a suite.
 */
export function setupTestDatabase(): void {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    stdio: 'pipe',
  });
}

/**
 * Truncate all application tables in the test database.
 * Call this between tests for isolation.
 */
export async function cleanDatabase(): Promise<void> {
  const client = getTestPrismaClient();

  const tablenames = await client.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`;

  for (const { tablename } of tablenames) {
    await client.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${tablename}" CASCADE`,
    );
  }
}

/**
 * Disconnect the test PrismaClient.
 * Call this once after all tests in a suite.
 */
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
