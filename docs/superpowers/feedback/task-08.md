# Task 08: Auth Handlers + Unit Tests — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**RegisterCommand + RegisterHandler** (`src/features/auth/application/register-command.ts`)
- [x] Command class with `email`, `name`, `password` readonly fields
- [x] Handler checks for duplicate email before registration
- [x] Handler hashes password with `bcryptjs.hash(password, 10)` (10 rounds)
- [x] Handler generates UUID via `uuidv4()`
- [x] Handler creates `User` entity with all required fields
- [x] Handler saves user via `userRepo.save()`
- [x] Handler returns `userId` (string)
- [x] Handler receives `IUserRepository` via constructor injection

**RegisterCommand Unit Tests** (`src/features/auth/application/__tests__/register-command.unit.test.ts`)
- [x] Test: creates a user and returns userId
- [x] Test: hashes the password (verifies passwordHash differs from plaintext)
- [x] Test: rejects duplicate email (expects "Email already registered")

**GetAllUsersQuery + GetAllUsersHandler** (`src/features/auth/application/get-all-users-query.ts`)
- [x] Empty query class `GetAllUsersQuery`
- [x] Handler fetches all users via `userRepo.findAll()`
- [x] Handler maps users to `UserDTO` via `toUserDTO()` (strips passwordHash)
- [x] Handler returns `UserDTO[]`
- [x] Handler receives `IUserRepository` via constructor injection

**GetAllUsersQuery Unit Tests** (`src/features/auth/application/__tests__/get-all-users-query.unit.test.ts`)
- [x] Test: returns empty array when no users exist
- [x] Test: returns users as DTOs without passwordHash

### Deviations from Plan

- `get-all-users-query.ts:9` — Parameter named `_` instead of plan's `_query`. Functionally identical; both indicate unused parameter. Cosmetic only.
- `get-all-users-query.unit.test.ts:33` — Uses `(result[0] as Record<string, unknown>).passwordHash` instead of plan's `(result[0] as any).passwordHash`. This is a type-safety improvement over the plan — avoids `any`.

### Deviations from Spec
- None. The spec requires registration with duplicate-email check, password hashing with bcrypt, UUID generation, and a query that returns DTOs without passwordHash. All requirements are met.

## Code Quality Review

### Architecture & Patterns
- Clean CQRS pattern: command/query classes are pure data, handlers contain logic and receive repos via constructor DI.
- Handler depends only on `IUserRepository` interface — no infrastructure coupling.
- `toUserDTO` function from domain layer used for mapping — reusable and tested transitively.
- File structure matches plan: command and handler co-located in same file, tests in `__tests__/` subdirectory.

### Code Issues
- **No error typing.** `RegisterHandler` throws `new Error("Email already registered")` — a generic Error. Route Handlers will need to catch and distinguish this from other errors to return appropriate HTTP status codes (409 or 400). This is acceptable at the handler level but downstream consumers should be aware. Consider a custom error class in the future.
- **No input validation in handler.** The handler trusts that email/name/password are valid strings. Validation is expected at the Route Handler layer via Zod schemas (Task 7). This is correct per the architecture — handlers assume pre-validated input.
- **`bcryptjs` import style.** Uses `import bcryptjs from "bcryptjs"` (default import). This works with `esModuleInterop: true` in tsconfig, which is standard for Next.js projects.

### Test Coverage
- All three plan-required test cases are present and correct.
- **Missing edge case:** No test for registering with empty string email/name. This is by design — input validation is handled by Zod schemas at the API boundary, not in the handler.
- **Missing edge case:** No test verifying the returned userId is a valid UUID format. Low priority since `uuidv4()` is well-tested library code.
- Password hash verification test (`passwordHash.length > 0`) is minimal but sufficient — it confirms hashing occurred without coupling to bcrypt internals.

### Naming & Style
- Consistent naming: `RegisterCommand`/`RegisterHandler`, `GetAllUsersQuery`/`GetAllUsersHandler`.
- File names match class names in kebab-case.
- `readonly` modifier on all command/query fields — immutable by convention.
- `beforeEach` correctly resets state for test isolation.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary
Auth handlers and tests match the plan and spec exactly. RegisterHandler correctly validates email uniqueness, hashes with bcrypt (10 rounds), and returns a UUID. GetAllUsersHandler correctly maps to DTOs stripping passwordHash. The one deviation (type-safe cast in test) is an improvement over the plan. Error typing is generic but appropriate for this layer.
