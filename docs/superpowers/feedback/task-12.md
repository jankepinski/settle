# Task 12: Drizzle Repository Implementations — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**DrizzleUserRepository** (`src/features/auth/infrastructure/drizzle-user-repository.ts`)
- [x] `findById` — select with `eq(users.id, id)`, returns `User | null`
- [x] `findByEmail` — select with `eq(users.email, email)`, returns `User | null`
- [x] `findAll` — select all from users
- [x] `save` — insert with all fields
- [x] Implements `IUserRepository` interface

**DrizzleGroupRepository** (`src/features/groups/infrastructure/drizzle-group-repository.ts`)
- [x] `findById` — select with `eq(groups.id, id)`
- [x] `findByUserId` — queries `groupMembers` then filters groups
- [x] `findMembersByGroupId` — select from `groupMembers` with group filter
- [x] `isMember` — select with `and(eq(groupId), eq(userId))`, checks length > 0
- [x] `save` — insert group
- [x] `addMember` — insert with `onConflictDoNothing()`
- [x] `removeMember` — delete with compound where clause
- [x] Implements `IGroupRepository` interface

**DrizzleExpenseRepository** (`src/features/expenses/infrastructure/drizzle-expense-repository.ts`)
- [x] `findById` — select, returns `Expense | null`
- [x] `findByGroupId` — select with group filter
- [x] `save` — insert with all fields
- [x] `update` — update `paidBy`, `amount`, `description` by id
- [x] `delete` — delete by id
- [x] Implements `IExpenseRepository` interface
- [x] **Type casting**: `findById` and `findByGroupId` cast `row.type as ExpenseType` ✓

**DrizzleExpenseSplitRepository** (`src/features/expenses/infrastructure/drizzle-expense-split-repository.ts`)
- [x] `findByExpenseId` — select with expense filter
- [x] `findByGroupId` — subquery on expenses, then `inArray` on splits
- [x] `saveMany` — bulk insert with early return for empty array
- [x] `deleteByExpenseId` — delete with expense filter
- [x] Implements `IExpenseSplitRepository` interface

### Deviations from Plan

1. **`ExpenseType` casting added** (`drizzle-expense-repository.ts:4,13,18`): The plan's code does `return result[0] ?? null` directly. The implementation imports `ExpenseType` and casts `result[0].type as ExpenseType`. This is a **correct and necessary fix** — Drizzle returns `type` as `string`, but the domain `Expense` interface requires `type: ExpenseType`. The plan's code would fail TypeScript compilation. This is a positive deviation.

2. **Import consolidation** (`drizzle-expense-split-repository.ts:1`): The plan has `import { eq } from "drizzle-orm"` and separately `import { inArray } from "drizzle-orm"`. The implementation consolidates: `import { eq, inArray } from "drizzle-orm"`. Trivial positive change.

### Deviations from Spec

None.

## Code Quality Review

### Architecture & Patterns

- All four repositories follow the same structural pattern: constructor takes `Database`, methods map directly to Drizzle queries. Clean and consistent.
- Repositories correctly use the shared `Database` type from `@/shared/infrastructure/db/client`.
- Each repository `implements` its corresponding domain interface, enforcing the contract at compile time.

### Code Issues

1. **`findByUserId` in `DrizzleGroupRepository` is inefficient** (`drizzle-group-repository.ts:15-26`): After fetching group IDs from `groupMembers`, it does `this.db.select().from(groups)` (selects ALL groups) then filters in JS with `.filter(g => groupIds.includes(g.id))`. This should use Drizzle's `inArray(groups.id, groupIds)` for a SQL-level `WHERE id IN (...)`. For a small MVP this works, but it scans the entire `groups` table on every call. This matches the plan exactly, so it's a plan-level issue, not an implementation bug.

2. **`update` in `DrizzleExpenseRepository` only updates 3 fields** (`drizzle-expense-repository.ts:34-40`): The `.set()` call updates `paidBy`, `amount`, `description` but not `type` or `groupId`. This is correct per the spec — `UpdateExpenseCommand` is a "full replacement" of those three fields, and `type`/`groupId`/`createdAt` are immutable. The plan explicitly specifies this.

3. **No error handling for failed operations**: None of the repositories handle database errors (e.g., FK constraint violations, unique constraint violations). This is appropriate — errors bubble up as unhandled rejections to the handler/route layer. The integration tests verify constraint behavior.

### Test Coverage

No tests in this task — tests are Task 13. Repository implementations are pure infrastructure and are verified via integration tests against real Postgres.

### Naming & Style

- File naming follows plan convention: `drizzle-{entity}-repository.ts`.
- Class naming follows pattern: `Drizzle{Entity}Repository`.
- Consistent use of `private readonly db: Database` constructor parameter.
- Clean use of Drizzle ORM API: `select().from().where()`, `insert().values()`, `update().set().where()`, `delete().where()`.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS_WITH_CONCERNS

## Summary

All four Drizzle repository implementations faithfully implement their domain interfaces with correct Drizzle ORM usage. The one positive deviation from the plan is the `ExpenseType` cast in `DrizzleExpenseRepository`, which is a necessary TypeScript fix the plan overlooked. The main code quality concern is the `findByUserId` method in `DrizzleGroupRepository`, which fetches all groups and filters in JS instead of using SQL `IN()` — functional but inefficient. This is a plan-level design issue carried forward. Overall, clean, consistent infrastructure code.
