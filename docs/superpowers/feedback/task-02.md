# Task 02: Vitest Configuration — Review Feedback

## Spec Compliance Review

### Requirements Checklist
- [x] `vitest.workspace.ts` with `defineWorkspace` referencing both configs
- [x] `vitest.unit.config.ts`: include `src/**/*.unit.test.ts`
- [x] `vitest.unit.config.ts`: environment `node`
- [x] `vitest.unit.config.ts`: `@` alias via `path.resolve`
- [x] `vitest.unit.config.ts`: `name: "unit"`
- [x] `vitest.integration.config.ts`: include `src/**/*.integration.test.ts`
- [x] `vitest.integration.config.ts`: environment `node`
- [x] `vitest.integration.config.ts`: `setupFiles` pointing to integration-setup.ts
- [x] `vitest.integration.config.ts`: `@` alias via `path.resolve`
- [x] `vitest.integration.config.ts`: `name: "integration"`
- [ ] `vitest.integration.config.ts`: `pool: "forks"` with `poolOptions.forks.singleFork: true`
- [x] `src/test-utils/integration-setup.ts` placeholder created

### Deviations from Plan

- **`vitest.unit.config.ts:9`** — Added `passWithNoTests: true`. Not in the plan but a pragmatic addition to avoid failures when running the test suite before any tests exist. Acceptable.

- **`vitest.integration.config.ts:11`** — Uses `fileParallelism: false` instead of the plan's `poolOptions: { forks: { singleFork: true } }`. The plan specifies:
  ```typescript
  pool: "forks",
  poolOptions: {
    forks: { singleFork: true },
  },
  ```
  The implementation uses:
  ```typescript
  pool: "forks",       // MISSING — pool key is absent
  fileParallelism: false,
  ```
  Correction: `pool: "forks"` is actually **not present** in the implementation. The config omits the `pool` property entirely and uses `fileParallelism: false` instead. While `fileParallelism: false` achieves a similar effect (prevents parallel file execution), it operates differently from `pool: "forks"` + `singleFork: true`. With `singleFork`, all tests run in a single forked process, which is important for integration tests sharing a database connection. `fileParallelism: false` only prevents files from running in parallel but may still use the default thread pool. **This is a meaningful deviation** that could affect integration test reliability.

- **`vitest.integration.config.ts:12`** — Added `passWithNoTests: true`. Not in the plan but reasonable (same as unit config).

- **`vitest.integration.config.ts:13-15`** — Added hardcoded `env.DATABASE_URL` pointing to the test database. Not in plan — the plan relies on `.env.test` file for this. This is actually a useful safeguard ensuring integration tests always use the test database regardless of environment file loading. However, it duplicates the value from `.env.test`, creating a maintenance risk if the URL changes.

- **`src/test-utils/integration-setup.ts`** — The plan specifies a placeholder (`export {};`), but the implementation contains a full setup with `truncateAllTables()` and `closeConnection()` utilities plus a Drizzle client. This is work that belongs to a later task (Task 13 per the plan comment). Not harmful, but it's ahead-of-schedule implementation.

### Deviations from Spec
- The spec requires "Two test suites, independently runnable" — this is achieved. The pool configuration deviation doesn't affect the ability to run suites independently.

## Code Quality Review

### Architecture & Patterns
- Workspace configuration follows the standard Vitest workspace pattern.
- Separation of unit and integration configs is clean.

### Code Issues
- **`vitest.integration.config.ts`**: Missing `pool: "forks"` and `poolOptions.forks.singleFork` could lead to integration tests running in threads rather than forks. For database-heavy integration tests, forks provide better isolation (separate memory space). This should be corrected.
- **`src/test-utils/integration-setup.ts:7`**: The fallback URL uses port `5432` instead of `5433`, inconsistent with the rest of the project's port configuration. If `DATABASE_URL` is not set, it would connect to the wrong port.

### Test Coverage
- N/A for configuration task.

### Naming & Style
- File naming follows conventions.
- Config structure is clean and readable.

## Verdict

**Spec Compliance:** PASS_WITH_CONCERNS
**Code Quality:** PASS_WITH_CONCERNS

## Summary
Vitest workspace and configs are functional and follow the correct structure. Two concerns: (1) the integration config uses `fileParallelism: false` instead of the plan's `pool: "forks"` + `singleFork: true`, which changes process isolation semantics for integration tests; (2) the integration-setup.ts fallback URL uses port 5432, inconsistent with the project's 5433 port. The early implementation of truncation utilities in integration-setup.ts is ahead of schedule but not harmful.
