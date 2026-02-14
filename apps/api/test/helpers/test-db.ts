import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { execSync } from 'child_process';
import path from 'path';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://splitwise_test:splitwise_test@localhost:5433/splitwise_test?schema=public';

let prisma: PrismaClient;
let pool: pg.Pool;

/**
 * Get a PrismaClient connected to the test database.
 * Reuses the same client across the test suite.
 */
export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

/**
 * Get a raw pg Pool for operations that bypass Prisma (e.g. truncate).
 */
function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
  }
  return pool;
}

/**
 * Run Prisma migrations against the test database.
 * Call this once in a global setup.
 */
export function migrateTestDb() {
  const apiRoot = path.resolve(__dirname, '..', '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}

/**
 * Truncate all tables (except _prisma_migrations) to reset state between tests.
 * Uses raw pg to avoid Prisma's dynamic import issues in Jest.
 */
export async function truncateTables() {
  const p = getPool();
  await p.query('TRUNCATE TABLE "RefreshToken", "Account", "User" CASCADE');
}

/**
 * Disconnect the test PrismaClient and pool. Call in afterAll.
 */
export async function disconnectTestDb() {
  if (prisma) {
    await prisma.$disconnect();
  }
  if (pool) {
    await pool.end();
  }
}
