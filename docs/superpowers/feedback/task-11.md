# Task 11: Settlement + Balance Handlers + Unit Tests — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [x] `CreateSettlementCommand` class with `groupId`, `paidById`, `recipientId`, `amount` fields
- [x] `CreateSettlementHandler` validates `paidBy != recipient`
- [x] `CreateSettlementHandler` validates both payer and recipient are group members
- [x] Creates `Expense` with `type="settlement"`, `description=""`
- [x] Creates single `ExpenseSplit` to the recipient
- [x] Returns `expenseId`
- [x] Unit test: creates settlement with single split
- [x] Unit test: rejects `paidBy == recipient`
- [x] Unit test: rejects non-member payer
- [x] `DeleteSettlementCommand` class with `expenseId` field
- [x] `DeleteSettlementHandler` finds expense, validates `type === "settlement"`
- [x] `DeleteSettlementHandler` deletes splits then expense
- [x] Unit test: deletes settlement
- [x] Unit test: rejects deleting a non-settlement
- [x] `GetGroupBalancesQuery` class with `groupId` field
- [x] `GetGroupBalancesHandler` gets all members, sums paid amounts, subtracts split amounts
- [x] Returns `{userId, balance}` array for every group member (including zero balances)
- [x] Unit test: zero balances when no expenses
- [x] Unit test: correct single expense balances (u1 paid 900, split 3 ways → u1=+600, u2=-300, u3=-300)
- [x] Unit test: settlement zeroes out balances
- [x] `GetGroupExpensesQuery` class with `groupId` field
- [x] `GetGroupExpensesHandler` returns expenses with attached splits
- [x] `MemberBalance` interface exported
- [x] `ExpenseWithSplits` interface exported
- [ ] **Missing:** No unit tests for `GetGroupExpensesQuery` — plan notes this is intentional ("Plan doesn't have explicit tests"), but the query does have an N+1 pattern that would benefit from at least a basic smoke test

### Deviations from Plan

None. Every file matches the plan's code exactly, character-for-character.

### Deviations from Spec

- **No amount validation in `CreateSettlementHandler`**: The spec says settlements require "amount (positive integer cents)" but the handler does not validate `amount > 0`. A settlement with `amount=0` or `amount=-100` would be accepted. This is a spec-level gap that should be fixed in the handler (same concern exists in `CreateExpenseHandler` per earlier tasks, but settlement is specifically noted here).
- **No "not found" check for recipient in `CreateSettlementHandler`**: If the recipient is not a member, the error message says "is not a group member" — this is correct per spec. No deviation.

## Code Quality Review

### Architecture & Patterns

- Clean CQRS pattern maintained: command + handler co-located in single file, consistent with all other handlers in the project.
- Dependency injection via constructor — correct use of repository interfaces, no concrete implementations referenced.
- `GetGroupBalancesHandler` correctly initializes all members to 0 balance before computing, ensuring members with no activity appear in the result.
- `GetGroupExpensesHandler` is straightforward and clean.

### Code Issues

1. **N+1 query in `GetGroupExpensesHandler`** (`get-group-expenses-query.ts:24-25`): For each expense, a separate `findByExpenseId` call is made. With many expenses this becomes slow. The `IExpenseSplitRepository` already has `findByGroupId`, which could fetch all splits in one call, then group them in memory. This matches how `GetGroupBalancesHandler` works (single call per data source). Not a plan deviation since the plan specifies this exact code, but worth noting as a future optimization.

2. **No validation of positive amount** in `CreateSettlementHandler` (`create-settlement-command.ts:23`): The handler validates payer/recipient identity and membership but does not guard against `amount <= 0`. The API layer may add Zod validation, but defense-in-depth in the handler is good practice.

3. **`DeleteSettlementHandler` manually deletes splits before expense** (`delete-settlement-command.ts:23-24`): Since the schema has `onDelete: "cascade"` on `expense_splits.expenseId`, deleting the expense alone would cascade-delete splits. The explicit split deletion is redundant but harmless — it acts as defense-in-depth and makes the handler's intent clear.

### Test Coverage

- **CreateSettlementHandler**: 3 tests covering happy path, self-payment rejection, and non-member rejection. Missing: non-member recipient test (only non-member payer is tested). The handler does validate the recipient too (line 33-36), but there's no test exercising that path.
- **DeleteSettlementHandler**: 2 tests covering happy path and type-guard rejection. Missing: "expense not found" error path.
- **GetGroupBalancesHandler**: 3 tests with good coverage of the core formula. The settlement test (u2 settles 300 with u1) correctly verifies that the balance formula works uniformly for both expenses and settlements.

### Naming & Style

- Consistent naming: `*Command`, `*Handler`, `*Query` pattern maintained.
- Consistent file naming: `create-settlement-command.ts`, `delete-settlement-command.ts`, `get-group-balances-query.ts`, `get-group-expenses-query.ts`.
- `MemberBalance` and `ExpenseWithSplits` interfaces are well-named and appropriately exported from their query files.

## Verdict

**Spec Compliance:** PASS_WITH_CONCERNS
**Code Quality:** PASS_WITH_CONCERNS

## Summary

Task 11 is faithfully implemented per the plan. All four handlers (`CreateSettlementHandler`, `DeleteSettlementHandler`, `GetGroupBalancesHandler`, `GetGroupExpensesHandler`) match the plan's code exactly. Test coverage is solid for the balance calculation logic. Two concerns: (1) missing positive-amount validation in `CreateSettlementHandler` — the spec requires "positive integer cents" but the handler doesn't enforce it, relying entirely on the API/Zod layer; (2) the `GetGroupExpensesHandler` has an N+1 query pattern that will scale poorly. Both are plan-conformant but worth addressing. Minor test gaps exist (no test for non-member recipient, no test for "expense not found" in delete).
