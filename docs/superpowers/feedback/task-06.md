# Task 06: In-Memory Repository Mocks — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**InMemoryUserRepository** (`src/test-utils/in-memory-user-repository.ts`)
- [x] Implements `IUserRepository` interface
- [x] `findById(id)` — returns user or null
- [x] `findByEmail(email)` — returns user or null
- [x] `findAll()` — returns shallow copy of all users
- [x] `save(user)` — appends to internal array

**InMemoryGroupRepository** (`src/test-utils/in-memory-group-repository.ts`)
- [x] Implements `IGroupRepository` interface
- [x] `findById(id)` — returns group or null
- [x] `findByUserId(userId)` — joins members to groups, returns filtered list
- [x] `findMembersByGroupId(groupId)` — filters members by groupId
- [x] `isMember(groupId, userId)` — checks existence in members array
- [x] `save(group)` — appends to internal array
- [x] `addMember(member)` — deduplicates by `(groupId, userId)` before inserting
- [x] `removeMember(groupId, userId)` — filters out matching entry

**InMemoryExpenseRepository** (`src/test-utils/in-memory-expense-repository.ts`)
- [x] Implements `IExpenseRepository` interface
- [x] `findById(id)` — returns expense or null
- [x] `findByGroupId(groupId)` — filters by groupId
- [x] `save(expense)` — appends to internal array
- [x] `update(expense)` — replaces by index if found
- [x] `delete(id)` — filters out matching entry

**InMemoryExpenseSplitRepository** (`src/test-utils/in-memory-expense-split-repository.ts`)
- [x] Implements `IExpenseSplitRepository` interface
- [x] `findByExpenseId(expenseId)` — filters by expenseId
- [x] `findByGroupId(groupId)` — returns all splits (known simplification per plan)
- [x] `saveMany(splits)` — spreads into internal array
- [x] `deleteByExpenseId(expenseId)` — filters out matching entries

### Deviations from Plan
- `in-memory-expense-split-repository.ts:12` — Uses `void groupId;` to suppress unused-parameter lint warning. The plan shows the parameter as simply unused without suppression. This is a reasonable improvement over the plan.
- No other deviations. All four files are character-for-character matches to the plan (modulo the `void` line).

### Deviations from Spec
- None. The spec requires "in-memory repos for unit tests" and all four domain repository interfaces are implemented.

## Code Quality Review

### Architecture & Patterns
- Correctly implements domain interfaces from feature folders — follows Clean Architecture dependency rule (test-utils depends on domain, not infrastructure).
- Each repo is a standalone class with no external dependencies, suitable for isolated unit testing.
- All methods are `async` returning `Promise`, matching the interface signatures designed for async real implementations.

### Code Issues
1. **`InMemoryUserRepository.save` does not enforce uniqueness.** If a test calls `save()` twice with the same email or ID, both entries are stored. The real Drizzle repo would fail on the DB unique constraint. This is acceptable for unit tests since handlers check duplicates before calling save, but could cause confusing test failures if tests ever bypass the handler.
2. **`InMemoryExpenseRepository.update` silently no-ops for non-existent IDs.** If `findIndex` returns -1, the `if (index !== -1)` guard means nothing happens. The real DB `update` with a WHERE clause would similarly affect 0 rows. Acceptable for test doubles, but a stricter mock could throw to catch logic errors earlier.
3. **`InMemoryExpenseSplitRepository.findByGroupId` returns all splits regardless of group.** This is the documented known simplification. It works correctly for unit tests that only use a single group, but tests involving multiple groups would get incorrect results. Future multi-group tests should be aware of this limitation.

### Test Coverage
- N/A — these are test utilities, not production code. They are exercised transitively through the handler unit tests in Tasks 8-10.

### Naming & Style
- Class names follow `InMemory[Entity]Repository` convention consistently.
- File names follow `in-memory-[entity]-repository.ts` kebab-case convention.
- Import paths use `@/` alias correctly.
- Return types match interface signatures exactly.
- `void groupId;` is an unconventional but valid lint-suppression idiom — a `_groupId` parameter rename would be more conventional but would deviate from the interface signature.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary
All four in-memory repository implementations match the plan exactly and correctly implement their respective domain interfaces. The known `findByGroupId` simplification in the expense split repo is documented. Minor robustness gaps (no uniqueness enforcement in save, silent no-op on update miss) are acceptable tradeoffs for test doubles.
