# Task 03: Database Schema — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**`src/shared/infrastructure/db/schema.ts`:**
- [x] `users` table with uuid PK (`defaultRandom`)
- [x] `users.email` — varchar(255), notNull, unique
- [x] `users.name` — varchar(255), notNull
- [x] `users.passwordHash` — varchar(255), notNull, mapped to `password_hash`
- [x] `users.createdAt` — timestamp with timezone, defaultNow, notNull
- [x] `groups` table with uuid PK (`defaultRandom`)
- [x] `groups.name` — varchar(255), notNull
- [x] `groups.createdBy` — uuid, notNull, references `users.id`
- [x] `groups.createdAt` — timestamp with timezone, defaultNow, notNull
- [x] `groupMembers` table with composite PK (`groupId`, `userId`)
- [x] `groupMembers.groupId` — uuid, notNull, references `groups.id`
- [x] `groupMembers.userId` — uuid, notNull, references `users.id`
- [x] `groupMembers.joinedAt` — timestamp with timezone, defaultNow, notNull
- [x] `expenses` table with uuid PK (`defaultRandom`)
- [x] `expenses.groupId` — uuid, notNull, references `groups.id`
- [x] `expenses.paidBy` — uuid, notNull, references `users.id`
- [x] `expenses.amount` — integer, notNull
- [x] `expenses.description` — varchar(500), notNull
- [x] `expenses.type` — varchar(20), notNull, default "expense"
- [x] `expenses.createdAt` — timestamp with timezone, defaultNow, notNull
- [x] `expenseSplits` table with uuid PK (`defaultRandom`)
- [x] `expenseSplits.expenseId` — uuid, notNull, references `expenses.id` with `onDelete: "cascade"`
- [x] `expenseSplits.userId` — uuid, notNull, references `users.id`
- [x] `expenseSplits.amount` — integer, notNull

**`src/shared/infrastructure/db/client.ts`:**
- [x] Uses `drizzle` from `drizzle-orm/postgres-js`
- [x] Uses `postgres` from `postgres`
- [x] Imports schema with `* as schema`
- [x] Reads `DATABASE_URL` from `process.env`
- [x] Exports `db` instance and `Database` type

**Migration:**
- [x] Migration generated in `drizzle/` folder (`0000_daily_hercules.sql`)
- [x] Migration journal exists (`drizzle/meta/_journal.json`)
- [x] Generated SQL includes all 5 tables with correct columns
- [x] Foreign keys present in migration SQL
- [x] Cascade delete on `expense_splits.expense_id` confirmed in SQL (line 41)
- [x] Unique constraint on `users.email` confirmed in SQL (line 38)
- [x] Composite primary key on `group_members` confirmed in SQL (line 22)

### Deviations from Plan
- None. The schema file is a character-for-character match with the plan.
- The client file is an exact match with the plan.

### Deviations from Spec
- None. All entity fields from the spec's Domain Model section are represented. Column types are correct (uuid PKs, varchar, integer for amounts, timestamp with timezone).

## Code Quality Review

### Architecture & Patterns
- Schema is cleanly organized in a single file as specified.
- Client module correctly separates connection creation from schema definition.
- The `Database` type export enables type-safe dependency injection for repository implementations.

### Code Issues
- **No bugs found.** Schema is straightforward and correct.
- **Minor observation:** The `expenses.type` column uses `varchar(20)` rather than a PostgreSQL enum. This matches the plan and is acceptable for MVP — it allows flexibility, though it doesn't enforce valid values at the DB level. The spec's `ExpenseType = "expense" | "settlement"` constraint will be enforced at the application layer via Zod.
- **Minor observation:** No cascade delete on `expenses` → `groups` FK or `group_members` → `groups` FK. The spec mentions "Removing a group member" has business rules (blocked if has expenses), and there's no delete-group in MVP, so this is correct — no cascade is the right choice here.

### Test Coverage
- N/A for schema definition. Schema correctness is tested via integration tests in later tasks.

### Naming & Style
- Column names use snake_case in the database (`password_hash`, `created_at`, etc.) with camelCase in TypeScript (`passwordHash`, `createdAt`). This is the standard Drizzle convention.
- Table names use plural snake_case (`users`, `groups`, `group_members`, `expenses`, `expense_splits`). Consistent.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary
The database schema is an exact match with the plan. All five tables are correctly defined with proper column types, foreign keys, cascade behavior, and constraints. The migration was generated and contains the expected DDL. The DB client module is clean and type-safe.
