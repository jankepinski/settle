import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@/shared/infrastructure/db/schema";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://settle:settle@localhost:5433/settle_test";

const queryClient = postgres(TEST_DATABASE_URL);
export const testDb = drizzle(queryClient, { schema });

export async function truncateAllTables() {
  await testDb.execute(sql`TRUNCATE TABLE expense_splits, expenses, group_members, groups, users CASCADE`);
}

export async function closeConnection() {
  await queryClient.end();
}
