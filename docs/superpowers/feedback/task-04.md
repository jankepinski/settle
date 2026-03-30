# Task 04: Domain Entities and Repository Interfaces — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**`src/features/auth/domain/user.ts`:**
- [x] `User` interface with fields: id (string), email (string), name (string), passwordHash (string), createdAt (Date)
- [x] `UserDTO` interface with fields: id (string), email (string), name (string) — no passwordHash
- [x] `toUserDTO` function mapping User → UserDTO

**`src/features/auth/domain/user-repository.interface.ts`:**
- [x] `IUserRepository` interface exported
- [x] `findById(id: string): Promise<User | null>`
- [x] `findByEmail(email: string): Promise<User | null>`
- [x] `findAll(): Promise<User[]>`
- [x] `save(user: User): Promise<void>`

**`src/features/groups/domain/group.ts`:**
- [x] `Group` interface with fields: id (string), name (string), createdBy (string), createdAt (Date)
- [x] `GroupMember` interface with fields: groupId (string), userId (string), joinedAt (Date)

**`src/features/groups/domain/group-repository.interface.ts`:**
- [x] `IGroupRepository` interface exported
- [x] `findById(id: string): Promise<Group | null>`
- [x] `findByUserId(userId: string): Promise<Group[]>`
- [x] `findMembersByGroupId(groupId: string): Promise<GroupMember[]>`
- [x] `isMember(groupId: string, userId: string): Promise<boolean>`
- [x] `save(group: Group): Promise<void>`
- [x] `addMember(member: GroupMember): Promise<void>`
- [x] `removeMember(groupId: string, userId: string): Promise<void>`

**`src/features/expenses/domain/expense.ts`:**
- [x] `ExpenseType` type alias: `"expense" | "settlement"`
- [x] `Expense` interface with fields: id (string), groupId (string), paidBy (string), amount (number), description (string), type (ExpenseType), createdAt (Date)
- [x] `ExpenseSplit` interface with fields: id (string), expenseId (string), userId (string), amount (number)

**`src/features/expenses/domain/expense-repository.interface.ts`:**
- [x] `IExpenseRepository` interface exported
- [x] `findById(id: string): Promise<Expense | null>`
- [x] `findByGroupId(groupId: string): Promise<Expense[]>`
- [x] `save(expense: Expense): Promise<void>`
- [x] `update(expense: Expense): Promise<void>`
- [x] `delete(id: string): Promise<void>`

**`src/features/expenses/domain/expense-split-repository.interface.ts`:**
- [x] `IExpenseSplitRepository` interface exported
- [x] `findByExpenseId(expenseId: string): Promise<ExpenseSplit[]>`
- [x] `findByGroupId(groupId: string): Promise<ExpenseSplit[]>`
- [x] `saveMany(splits: ExpenseSplit[]): Promise<void>`
- [x] `deleteByExpenseId(expenseId: string): Promise<void>`

**`src/features/expenses/domain/split-calculator.ts`:**
- [x] `calculateEqualSplits` function exported
- [x] Parameters: `expenseId: string`, `amount: number`, `participantIds: string[]`
- [x] Returns `ExpenseSplit[]`
- [x] Sorts participants by userId before distribution
- [x] Calculates `baseAmount` via `Math.floor(amount / sorted.length)`
- [x] Calculates `remainder` via `amount % sorted.length`
- [x] Distributes remainder one-per-person to first N sorted participants
- [x] Generates unique UUID ids via `uuidv4()`

### Deviations from Plan
- None. Every file is a character-for-character match with the plan's code blocks.

### Deviations from Spec

- None. The domain model matches the spec exactly:
  - User entity fields match the spec table.
  - Group and GroupMember fields match.
  - Expense fields match (including `type` as ExpenseType union).
  - ExpenseSplit fields match.
  - Repository interfaces match the spec's listed methods for IUserRepository, IGroupRepository, IExpenseRepository, IExpenseSplitRepository.
  - The split calculator implements the spec's "Equal split remainder handling" rule: "remainder cents are distributed one-per-person to the first N participants (ordered by userId)."

## Code Quality Review

### Architecture & Patterns
- **Clean Architecture compliance:** Domain entities are pure TypeScript interfaces with no infrastructure dependencies. Repository interfaces are defined in the domain layer, not the infrastructure layer. This is textbook Clean Architecture.
- **Feature-sliced:** Each feature (auth, groups, expenses) has its own domain folder. Cross-feature dependencies are minimal (ExpenseSplit references userId but doesn't import from the auth feature directly — it uses primitive string types).
- **CQRS readiness:** The UserDTO and toUserDTO function establish the pattern of separating read models from domain models, preparing for query handlers.

### Code Issues
- **No bugs found.**
- **Edge case in `calculateEqualSplits`:** The function does not validate for empty `participantIds` or non-positive `amount`. Calling with an empty array would cause a division-by-zero (`Math.floor(amount / 0)` → `Infinity`). Calling with `amount <= 0` would produce zero or negative splits. However, the plan and spec indicate that validation happens at the command handler level (CreateExpenseCommand validates `participantIds` must be non-empty and `amount` must be positive), so this is acceptable — the split calculator is a pure calculation function that trusts its callers.
- **Minor:** `participantIds` mutation is safely avoided via `[...participantIds].sort()`. Good defensive practice.

### Test Coverage
- Split calculator tests are in Task 5 (next task). The calculator is the only piece with testable logic in this task.
- Entity interfaces and repository interfaces are type-only — no runtime behavior to test.

### Naming & Style
- Interface names use the `I` prefix convention (`IUserRepository`, `IGroupRepository`, etc.) — consistent throughout.
- Entity interfaces use PascalCase. Fields use camelCase. Consistent.
- File names use kebab-case with `.interface.ts` suffix for repository interfaces. Consistent.
- Function `toUserDTO` uses camelCase. `calculateEqualSplits` uses camelCase. Consistent.
- Type alias `ExpenseType` uses PascalCase. Consistent with TypeScript conventions.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary
All domain entities, repository interfaces, and the split calculator are exact matches with the plan and fully aligned with the spec. The code follows Clean Architecture principles with domain types having zero infrastructure dependencies. The split calculator correctly implements the deterministic remainder distribution algorithm. No bugs or style issues found.
