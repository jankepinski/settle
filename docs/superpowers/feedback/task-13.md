# Task 13: Integration Tests + Test DB Setup — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**integration-setup.ts** (`src/test-utils/integration-setup.ts`)
- [x] Creates `testDb` Drizzle client with `postgres` driver
- [x] Uses `process.env.DATABASE_URL` with fallback
- [x] `truncateAllTables()` — truncates all 5 tables with CASCADE in correct dependency order
- [x] `closeConnection()` — ends the postgres client
- [x] Imports schema for typed Drizzle instance

**vitest.integration.config.ts**
- [x] Includes `src/**/*.integration.test.ts` pattern
- [x] Environment set to `"node"`
- [x] setupFiles points to `integration-setup.ts`
- [x] Uses `pool: "forks"` for process isolation
- [x] Sets `DATABASE_URL` env var pointing to `settle_test` database
- [x] Path alias `@` → `./src` configured
- [x] Sequential test execution configured

**User repo integration test** (`drizzle-user-repository.integration.test.ts`)
- [x] save + findById
- [x] findByEmail
- [x] null for non-existent user
- [x] findAll
- [x] reject duplicate email (unique constraint)

**Group repo integration test** (`drizzle-group-repository.integration.test.ts`)
- [x] save + findById
- [x] addMember + findMembersByGroupId
- [x] idempotent addMember (onConflictDoNothing)
- [x] isMember returns correct boolean
- [x] removeMember
- [x] findByUserId

**Expense repo integration test** (`drizzle-expense-repository.integration.test.ts`)
- [x] save + findById expense
- [x] save + findByExpenseId splits
- [x] cascade delete (delete expense → splits gone)
- [x] findByGroupId on expenses
- [x] findByGroupId on splits
- [x] update expense

### Deviations from Plan

1. **Port change: 5432 → 5433** (`vitest.integration.config.ts:14`): The plan specifies `localhost:5432`, but the implementation uses `localhost:5433`. This aligns with `docker-compose.yml` which maps host port `5433` to container port `5432`. The plan's URL was incorrect; the implementation is correct.

2. **Sequential execution mechanism differs** (`vitest.integration.config.ts:11`): The plan uses `poolOptions: { forks: { singleFork: true } }`. The implementation uses `fileParallelism: false`. Both achieve serial test execution, but `fileParallelism` is the more modern/idiomatic vitest approach. Functionally equivalent.

3. **`passWithNoTests: true` added** (`vitest.integration.config.ts:12`): Not in the plan. Prevents vitest from failing if no integration test files match. Harmless addition that improves developer experience.

4. **Fallback URL port mismatch** (`integration-setup.ts:7`): The fallback URL `postgres://settle:settle@localhost:5432/settle_test` uses port 5432, but Docker exposes on 5433. This fallback would connect to the wrong port if `DATABASE_URL` is not set. In practice, vitest.integration.config.ts always sets `DATABASE_URL` to port 5433, so the fallback is never reached in normal test runs. Still, the fallback is misleading.

5. **GroupMember import removed** (`drizzle-group-repository.integration.test.ts:6`): Plan imports `{ Group, GroupMember }` but implementation only imports `{ Group }`. GroupMember is never used by name in the test (member objects are passed as inline literals), so removing the unused import is correct.

### Deviations from Spec

None. The spec requires "real Postgres, truncate between tests, test CRUD + FK constraints + cascades + unique constraints" — all present.

## Code Quality Review

### Architecture & Patterns

- Clean separation: setup utilities in `src/test-utils/`, test files in `infrastructure/__tests__/` next to their implementations. Matches the project's file convention.
- Each test suite properly uses `beforeEach` to truncate all tables, ensuring test isolation.
- All suites use `afterAll` to close the DB connection, preventing hanging test processes.
- Foreign key dependencies are respected: user/group integration tests create prerequisite records in `beforeEach`.

### Code Issues

1. **`integration-setup.ts` is listed in `setupFiles` but used as a shared import** (`vitest.integration.config.ts:9`): The file is both a vitest setup file (line 9) AND imported directly in tests (e.g., `import { testDb, truncateAllTables, closeConnection } from "@/test-utils/integration-setup"`). As a `setupFile`, vitest will execute it once before all tests. As an import, each test file will also import it. Since the module is cached, this works fine — the DB client is created once. However, making it a `setupFile` is misleading since it doesn't use vitest's `beforeAll`/`afterAll` hooks at the file level. It merely ensures the module is loaded. Not a bug, but the `setupFiles` entry could be removed without affecting test behavior.

2. **Multiple `closeConnection()` calls across test files**: Each integration test file has its own `afterAll(() => closeConnection())`. Since all three files share the same singleton `queryClient`, the first `afterAll` to run will close the connection, and subsequent calls to `queryClient.end()` may throw or no-op depending on the postgres.js driver behavior. With `fileParallelism: false`, files run sequentially, so the connection closes after the first file's `afterAll`, and subsequent files may fail trying to use a closed connection. This is a real concern if test files are run together — the `pool: "forks"` setting mitigates this by running each file in a separate process with its own module state.

3. **Hardcoded UUIDs throughout tests**: Tests use explicit UUID strings like `"550e8400-e29b-41d4-a716-446655440000"`. This is fine for readability and determinism, but if someone accidentally duplicates a UUID across test files, it wouldn't matter because each test truncates all tables. Acceptable for an MVP.

4. **Cascade delete test is infrastructure-level** (`drizzle-expense-repository.integration.test.ts:56-68`): This test correctly verifies that the `onDelete: "cascade"` constraint on `expense_splits.expenseId` works at the database level. Good coverage of a schema-level behavior.

### Test Coverage

- **User repo**: 5 tests covering all 4 interface methods plus the unique email constraint. Thorough.
- **Group repo**: 6 tests covering all 7 interface methods (findById + save tested together). Missing: no test for `findById` returning null for non-existent group (the user repo has this pattern but group repo doesn't).
- **Expense repo**: 6 tests covering save, find, splits, cascade, findByGroupId, update. Missing: no test for `findById` returning null for non-existent expense; no test for `deleteByExpenseId` on splits directly.

### Naming & Style

- File naming follows convention: `drizzle-{entity}-repository.integration.test.ts`.
- Test descriptions are clear and action-oriented.
- Consistent use of `const repo = new Drizzle*Repository(testDb)` at describe-block level.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS_WITH_CONCERNS

## Summary

Integration test setup and all three test suites are well-implemented and cover the key requirements: CRUD operations, FK constraints, cascade deletes, unique constraints, and idempotent operations. The port change from 5432 to 5433 is a correct fix aligning with `docker-compose.yml`. Two concerns: (1) the fallback URL in `integration-setup.ts` uses port 5432, which is misleading since Docker maps to 5433; (2) multiple test files calling `closeConnection()` in `afterAll` on a shared singleton is a potential issue, though `pool: "forks"` mitigates it by process isolation. Minor test coverage gaps exist (no null-return tests for group/expense findById).
