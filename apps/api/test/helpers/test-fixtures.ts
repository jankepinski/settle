/**
 * Test data factories for creating test entities.
 *
 * Each factory returns a plain object with sensible defaults.
 * Pass `overrides` to customize specific fields.
 *
 * Note: These types are intentionally loose (Record-based) because
 * Prisma models have not been defined yet. Once the schema has models,
 * replace these with proper Prisma-generated types, e.g.:
 *
 *   import { User, Group, Expense } from '../../src/generated/prisma/client';
 *   export const createTestUser = (overrides?: Partial<User>): User => ({ ... });
 */

let userCounter = 0;

export const createTestUser = (
  overrides?: Record<string, unknown>,
): Record<string, unknown> => {
  userCounter++;
  return {
    email: `user${userCounter}@test.com`,
    name: `Test User ${userCounter}`,
    ...overrides,
  };
};

export const createTestGroup = (
  overrides?: Record<string, unknown>,
): Record<string, unknown> => ({
  name: 'Test Group',
  ...overrides,
});

export const createTestExpense = (
  overrides?: Record<string, unknown>,
): Record<string, unknown> => ({
  description: 'Lunch',
  amount: 10000, // cents
  currency: 'PLN',
  ...overrides,
});

/**
 * Reset counters between test suites if needed.
 */
export const resetFixtureCounters = (): void => {
  userCounter = 0;
};
