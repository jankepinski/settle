# Task 10: Expense Handlers + Unit Tests — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**CreateExpenseCommand + Handler** (`src/features/expenses/application/create-expense-command.ts`)
- [x] Command class with `groupId`, `paidById`, `amount`, `description`, `participantIds` readonly fields
- [x] Handler validates payer is a group member via `groupRepo.isMember()`
- [x] Handler validates all participants are group members (loop + `isMember()`)
- [x] Handler creates Expense entity with `type: "expense"`
- [x] Handler generates UUID for expense
- [x] Handler calculates equal splits via `calculateEqualSplits()`
- [x] Handler persists expense via `expenseRepo.save()`
- [x] Handler persists splits via `splitRepo.saveMany()`
- [x] Handler returns `expenseId`

**CreateExpenseCommand Unit Tests** (`__tests__/create-expense-command.unit.test.ts`)
- [x] Test: creates an expense with equal splits (900 / 3 = 300 each)
- [x] Test: rejects when paidById is not a group member
- [x] Test: rejects when a participant is not a group member
- [x] Test: allows payer to not be a participant (payer not in participantIds)

**UpdateExpenseCommand + Handler** (`src/features/expenses/application/update-expense-command.ts`)
- [x] Command class with `expenseId`, `amount`, `description`, `paidById`, `participantIds` readonly fields
- [x] Handler finds expense (throws "Expense not found" if missing)
- [x] Handler rejects settlements (throws "Cannot update a settlement")
- [x] Handler validates payer is a group member
- [x] Handler validates all participants are group members
- [x] Handler updates expense entity (amount, description, paidBy)
- [x] Handler deletes old splits via `splitRepo.deleteByExpenseId()`
- [x] Handler recalculates and persists new splits via `calculateEqualSplits()` + `saveMany()`

**UpdateExpenseCommand Unit Tests** (`__tests__/update-expense-command.unit.test.ts`)
- [x] Test: updates expense and recalculates splits (900→600, 3→2 participants)
- [x] Test: rejects updating a settlement

**DeleteExpenseCommand + Handler** (`src/features/expenses/application/delete-expense-command.ts`)
- [x] Command class with `expenseId` readonly field
- [x] Handler finds expense (throws "Expense not found" if missing)
- [x] Handler rejects settlements (throws "Use DeleteSettlementCommand for settlements")
- [x] Handler deletes splits first via `splitRepo.deleteByExpenseId()`
- [x] Handler deletes expense via `expenseRepo.delete()`

**DeleteExpenseCommand Unit Tests** (`__tests__/delete-expense-command.unit.test.ts`)
- [x] Test: deletes expense and its splits
- [x] Test: rejects deleting a settlement via expense delete

### Deviations from Plan
- None. All three handler files and all three test files are exact matches to the plan.

### Deviations from Spec
- None. All spec requirements for expense CRUD are correctly implemented:
  - Amounts in cents (integer) — enforced by Zod schemas at the API boundary, handler trusts validated input
  - Equal split with remainder handling — delegated to `calculateEqualSplits()` (tested in Task 5)
  - `type: "expense"` set on creation
  - Settlements not editable/deletable via expense endpoints — both Update and Delete handlers explicitly reject `type === "settlement"`
  - Delete cascades: splits deleted before expense (handler-level cascade, independent of DB-level cascade)

## Code Quality Review

### Architecture & Patterns
- Clean CQRS pattern consistently applied across all three handlers.
- All handlers receive repository interfaces via constructor DI.
- Cross-feature dependency: handlers depend on `IGroupRepository` for membership validation — same pattern as `RemoveGroupMemberHandler` in Task 9. Dependency is on interface, not implementation.
- Split calculation is correctly delegated to the domain-layer `calculateEqualSplits()` function — handlers don't implement split math.
- Delete handler performs explicit split deletion before expense deletion. This is defensive — even though the DB schema has `onDelete: "cascade"` on `expense_splits.expense_id`, the handler doesn't rely on it. Good practice for domain logic to be infrastructure-agnostic.

### Code Issues
1. **`UpdateExpenseHandler` does not update all fields.** The spread `{ ...expense, amount, description, paidBy }` preserves the original `groupId`, `type`, `createdAt`, and `id`. The spec says "full replacement — all fields must be provided," but `groupId` is not changeable (correct — an expense belongs to one group). This is the right behavior, just worth noting the spread semantics.
2. **No transactional guarantees.** `CreateExpenseHandler` calls `expenseRepo.save()` then `splitRepo.saveMany()` as two separate operations. If `saveMany` fails, the expense exists without splits. Similarly, `UpdateExpenseHandler` updates the expense, deletes old splits, then creates new splits — a failure mid-sequence leaves inconsistent state. This is acceptable for MVP with in-memory repos (which don't fail) and will need transaction support in the Drizzle implementation.
3. **Sequential membership checks in loops.** Both Create and Update handlers check `isMember()` in a `for` loop — N sequential async calls for N participants. A batch `areMembers(groupId, userIds[])` method would be more efficient. Low priority for MVP.
4. **Delete handler error message inconsistency.** `delete-expense-command.ts:21` throws `"Use DeleteSettlementCommand for settlements"` — the plan specifies the message as `"Use DeleteSettlementCommand for settlements"` which matches exactly. However, the briefing said `"Use DeleteSettlementCommand"` — the implementation includes the full message from the plan, which is correct.

### Test Coverage
All plan-required tests are present. Notable gaps that could strengthen coverage:

- **Missing: "expense not found" test for UpdateExpenseHandler.** The handler has this check (`throw new Error("Expense not found")`), but no test exercises it.
- **Missing: "expense not found" test for DeleteExpenseHandler.** Same situation — the error path exists but is untested.
- **Missing: non-member payer/participant tests for UpdateExpenseHandler.** The create handler has these tests, but the update handler (which has identical validation logic) does not. The logic works because it's the same code pattern, but the tests don't verify it independently.
- **Missing: remainder-distribution test for CreateExpenseHandler.** The equal-split tests use evenly divisible amounts (900/3). A test with e.g. 100/3 would verify remainder handling end-to-end through the handler (not just the calculator). This is covered in Task 5's calculator tests, but handler-level coverage would be more complete.
- All tests correctly use `beforeEach` to set up fresh repos and seed data.

### Naming & Style
- Consistent naming: `[Action]ExpenseCommand`/`[Action]ExpenseHandler`.
- File names are kebab-case matching class names.
- Test `beforeEach` blocks seed realistic data (group + members + expenses where needed).
- Test assertions are specific and descriptive.
- No unnecessary comments.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS_WITH_CONCERNS

## Summary
All three expense handlers match the plan and spec exactly. Create correctly validates membership and delegates to the split calculator. Update rejects settlements, validates membership, and fully recalculates splits. Delete rejects settlements and cascades split deletion. The primary concern is missing test coverage for error paths (expense not found, non-member validation in update) and absence of transactional guarantees across multi-repo operations — acceptable for MVP but should be addressed before production.
