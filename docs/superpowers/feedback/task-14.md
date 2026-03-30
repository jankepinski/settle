# Task 14: Composition Root (DI Container) — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [x] File located at `src/shared/infrastructure/di/container.ts`
- [x] Imports `db` from `../db/client`
- [x] Instantiates `DrizzleUserRepository` with `db`
- [x] Instantiates `DrizzleGroupRepository` with `db`
- [x] Instantiates `DrizzleExpenseRepository` with `db`
- [x] Instantiates `DrizzleExpenseSplitRepository` with `db`
- [x] Wires `RegisterHandler(userRepo)`
- [x] Wires `GetAllUsersHandler(userRepo)`
- [x] Wires `CreateGroupHandler(groupRepo)`
- [x] Wires `AddGroupMemberHandler(groupRepo)`
- [x] Wires `RemoveGroupMemberHandler(groupRepo, expenseRepo, splitRepo)`
- [x] Wires `GetUserGroupsHandler(groupRepo)`
- [x] Wires `GetGroupDetailsHandler(groupRepo)`
- [x] Wires `CreateExpenseHandler(expenseRepo, splitRepo, groupRepo)`
- [x] Wires `UpdateExpenseHandler(expenseRepo, splitRepo, groupRepo)`
- [x] Wires `DeleteExpenseHandler(expenseRepo, splitRepo)`
- [x] Wires `CreateSettlementHandler(expenseRepo, splitRepo, groupRepo)`
- [x] Wires `DeleteSettlementHandler(expenseRepo, splitRepo)`
- [x] Wires `GetGroupExpensesHandler(expenseRepo, splitRepo)`
- [x] Wires `GetGroupBalancesHandler(expenseRepo, splitRepo, groupRepo)`
- [x] All 14 handlers present
- [x] Exported as `handlers` const object with `as const`
- [x] `findExpenseById` helper function exported (for Task 16 access control)

### Deviations from Plan

1. **`findExpenseById` helper added** (`container.ts:27-29`): The plan's original Task 14 code does not include this function. It was noted as a later addition for Task 16's access control. The implementation proactively includes it. This is a forward-looking addition that doesn't break anything.

### Deviations from Spec

None. The spec requires "single file that instantiates repositories and wires them into handlers" — this is exactly what the file does.

## Code Quality Review

### Architecture & Patterns

- True "poor man's DI" composition root: no framework, no container library, just manual instantiation. Clean and debuggable.
- All dependencies flow from repositories → handlers. No circular dependencies.
- Singleton pattern: repositories and handlers are instantiated once at module load time. All route handlers importing this module share the same instances. This is correct for a request-scoped-stateless architecture.
- The `as const` assertion on the `handlers` object provides strong typing — consumers get exact handler types, not generic ones.

### Code Issues

1. **Module-level side effects**: The file executes `new DrizzleUserRepository(db)` etc. at import time. This means importing `container.ts` anywhere (even in tests) will attempt to connect to the database. This is by design for route handlers but could be problematic if the container is accidentally imported in a unit test. The separation of test configs (unit vs integration) mitigates this.

2. **`findExpenseById` breaks the pattern**: All other exports go through the `handlers` object, but `findExpenseById` is a standalone async function. It's a utility that wraps `expenseRepo.findById` — essentially exposing a repository method outside the container. This was added for Task 16's route handlers to look up an expense's `groupId` for access control. The alternative would be to expose `expenseRepo` directly or add a dedicated query handler. The function approach is pragmatic but slightly inconsistent.

3. **Constructor argument correctness verified**: Cross-referencing each handler's constructor signature with the wiring:
   - `RemoveGroupMemberHandler(groupRepo, expenseRepo, splitRepo)` — matches constructor `(IGroupRepository, IExpenseRepository, IExpenseSplitRepository)` ✓
   - `CreateExpenseHandler(expenseRepo, splitRepo, groupRepo)` — matches constructor `(IExpenseRepository, IExpenseSplitRepository, IGroupRepository)` ✓
   - `UpdateExpenseHandler(expenseRepo, splitRepo, groupRepo)` — matches constructor `(IExpenseRepository, IExpenseSplitRepository, IGroupRepository)` ✓
   - `DeleteExpenseHandler(expenseRepo, splitRepo)` — matches constructor `(IExpenseRepository, IExpenseSplitRepository)` ✓
   - All other handlers verified ✓

### Test Coverage

No tests for the composition root itself — this is standard practice. The container is validated indirectly through integration and E2E tests. Attempting to unit test a composition root is counterproductive since its value is in the actual wiring.

### Naming & Style

- Clean import organization: db client first, then repositories, then handlers.
- Handler property names in the `handlers` object are descriptive and camelCase: `register`, `getAllUsers`, `createGroup`, etc.
- File is concise at 47 lines — easy to scan and verify wiring.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary

The composition root is clean, complete, and correct. All 4 Drizzle repositories are instantiated with the shared `db` client, and all 14 handlers are wired with the correct repository dependencies. Constructor argument order has been verified against each handler's signature. The `findExpenseById` helper for Task 16 is the only addition beyond the plan's specification — it's pragmatic but slightly breaks the "all exports go through `handlers`" pattern. No issues requiring action.
