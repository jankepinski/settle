# Task 05: Split Calculator Unit Tests (TDD Checkpoint) — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**Test file location:**
- [x] File at `src/features/expenses/domain/__tests__/split-calculator.unit.test.ts`

**Required test cases:**
- [x] "splits evenly when divisible" — 900 / 3 = 300 each, verifies length, all amounts equal, sum
- [x] "distributes remainder to first N participants (sorted by userId)" — 100 / 3 with unsorted input ["c","a","b"], verifies a=34, b=33, c=33, sum=100
- [x] "handles single participant" — 500 / 1 = 500, verifies length and amount
- [x] "assigns correct expenseId to all splits" — verifies all splits have expenseId "exp-42"
- [x] "generates unique ids for each split" — verifies Set size equals array length

**Test structure:**
- [x] Imports `describe`, `it`, `expect` from `vitest`
- [x] Imports `calculateEqualSplits` from `../split-calculator`
- [x] Single `describe("calculateEqualSplits", ...)` block
- [x] Five `it(...)` test cases

### Deviations from Plan
- None. The test file is a character-for-character match with the plan's code block.

### Deviations from Spec
- None. The spec's key requirement for split calculator testing is: "Equal split calculation (exact division, remainder distribution, single participant, payer in/out of participants)." The first four test cases cover exact division, remainder distribution, and single participant. The "payer in/out of participants" scenario is a handler-level concern (the split calculator doesn't know about payers), so it's correctly deferred to later handler tests.

## Code Quality Review

### Architecture & Patterns
- Tests follow the standard Vitest pattern with `describe`/`it`/`expect`.
- Tests are pure unit tests with no mocks or infrastructure dependencies — testing a pure function.
- File naming convention `.unit.test.ts` matches the Vitest unit config's include pattern.

### Code Issues
- **No bugs found.** All assertions are correct and meaningful.

### Test Coverage

**Covered scenarios:**
1. Even division (900 / 3) — happy path
2. Remainder distribution (100 / 3) — the most important edge case for financial correctness
3. Single participant (500 / 1) — boundary case
4. ExpenseId propagation — structural correctness
5. Unique ID generation — structural correctness

**Not covered (but acceptable for this task):**
- Two participants with remainder (e.g., 101 / 2 = 51 + 50) — would increase confidence but isn't required by the plan
- Large number of participants — stress test, not required for MVP
- Very small amounts (e.g., 1 cent / 3 participants = 1 + 0 + 0) — interesting edge case but not in the plan
- Amount of 0 — the spec requires positive amounts, so this would be validated upstream
- The test for remainder distribution (`["c", "a", "b"]`) correctly passes unsorted input to verify that the function sorts internally — this is a well-designed test

**Observation:** The plan explicitly states exactly 5 test cases, and all 5 are present. The test coverage is exactly what was planned. Additional edge cases (like 2-participant remainder or minimal amounts) would be valuable additions but are not required by the plan.

### Naming & Style
- Test descriptions are clear and descriptive.
- The `byUser` helper object in the remainder test is a clean pattern for asserting per-user amounts.
- Assertions combine structural checks (length), value checks (amount), and aggregate checks (sum) — thorough for each scenario.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary
All five required split calculator unit tests are present and match the plan exactly. The tests cover the key scenarios: even division, remainder distribution with sort verification, single participant, expenseId propagation, and unique ID generation. Test quality is high — assertions are meaningful and the remainder test correctly uses unsorted input to verify internal sorting behavior.
