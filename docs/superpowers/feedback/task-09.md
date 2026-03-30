# Task 09: Groups Handlers + Unit Tests — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**CreateGroupCommand + Handler** (`src/features/groups/application/create-group-command.ts`)
- [x] Command class with `name`, `creatorId`, `memberIds` readonly fields
- [x] Handler generates UUID for group
- [x] Handler creates Group entity and saves via `groupRepo.save()`
- [x] Handler adds creator as member automatically
- [x] Handler adds additional members from `memberIds`
- [x] Handler deduplicates creator in memberIds via `Set`
- [x] Handler returns `groupId`

**CreateGroupCommand Unit Tests** (`__tests__/create-group-command.unit.test.ts`)
- [x] Test: creates group with creator as member
- [x] Test: adds additional members
- [x] Test: deduplicates creator in memberIds

**AddGroupMemberCommand + Handler** (`src/features/groups/application/add-group-member-command.ts`)
- [x] Command class with `groupId`, `userId` readonly fields
- [x] Handler finds group (throws "Group not found" if missing)
- [x] Handler adds member via `groupRepo.addMember()` (idempotent via repo dedup)

**AddGroupMemberCommand Unit Tests** (`__tests__/add-group-member-command.unit.test.ts`)
- [x] Test: adds a new member to the group
- [x] Test: is idempotent for existing members
- [x] Test: rejects when group does not exist

**RemoveGroupMemberCommand + Handler** (`src/features/groups/application/remove-group-member-command.ts`)
- [x] Command class with `groupId`, `userId` readonly fields
- [x] Handler checks `paidBy` on expenses (throws if member is payer)
- [x] Handler checks splits (throws if member appears in splits)
- [x] Handler removes member if clean via `groupRepo.removeMember()`
- [x] Handler receives three repos: `IGroupRepository`, `IExpenseRepository`, `IExpenseSplitRepository`

**RemoveGroupMemberCommand Unit Tests** (`__tests__/remove-group-member-command.unit.test.ts`)
- [x] Test: removes a member with no expenses
- [x] Test: rejects when member is paidBy on an expense
- [x] Test: rejects when member has expense splits

**GetUserGroupsQuery + Handler** (`src/features/groups/application/get-user-groups-query.ts`)
- [x] Query class with `userId` readonly field
- [x] Handler returns groups via `groupRepo.findByUserId()`

**GetUserGroupsQuery Unit Tests** (`__tests__/get-user-groups-query.unit.test.ts`)
- [x] Test: returns empty array when user has no groups
- [x] Test: returns only groups the user is a member of

**GetGroupDetailsQuery + Handler** (`src/features/groups/application/get-group-details-query.ts`)
- [x] Query class with `groupId` readonly field
- [x] Handler finds group (throws "Group not found" if missing)
- [x] Handler fetches members via `groupRepo.findMembersByGroupId()`
- [x] Handler returns `GroupDetails` (group + members)
- [x] `GroupDetails` interface exported

**GetGroupDetailsQuery Unit Tests** (`__tests__/get-group-details-query.unit.test.ts`)
- [x] Test: returns group with members
- [x] Test: throws when group not found

### Deviations from Plan
- None. All five handler files and all five test files are exact matches to the plan.

### Deviations from Spec
- **RemoveGroupMemberHandler does not verify group existence before removing.** The spec says a member cannot be removed if they have expenses/splits (409 Conflict). The handler correctly checks for expenses and splits, but does not verify the group itself exists. If called with a non-existent `groupId`, the expense and split repos would return empty arrays (no blocking data), and `groupRepo.removeMember()` would be a no-op. The result is a silent success for a non-existent group. The plan does not include this check either, so this is consistent with the plan but arguably a minor spec gap.
- **RemoveGroupMemberHandler does not verify the user IS a member.** Attempting to remove a non-member succeeds silently. Same reasoning — plan does not include this check. The Route Handler layer (future task) would typically handle access control.

## Code Quality Review

### Architecture & Patterns
- Clean CQRS separation across all five handlers. Commands mutate state, queries read state.
- All handlers receive repository interfaces via constructor DI — no infrastructure coupling.
- `RemoveGroupMemberHandler` crosses feature boundaries by depending on `IExpenseRepository` and `IExpenseSplitRepository` from the expenses domain. This is acceptable — the business rule ("cannot remove if has expenses") inherently spans features. The dependency is on interfaces, not implementations.
- `GroupDetails` interface is co-located with the query handler — appropriate since it's a query-specific DTO.

### Code Issues
1. **`RemoveGroupMemberHandler` missing group/member existence validation.** As noted above, calling with a non-existent group or non-member userId succeeds silently. While the Route Handler layer will enforce authentication and group membership for access control, the handler itself is more permissive than expected. Low severity since the downstream HTTP layer would catch the most common misuse cases.
2. **`CreateGroupHandler` calls `addMember` in a sequential loop.** For N members, this performs N sequential async operations. In the real Drizzle implementation this means N separate INSERT queries. A batch insert (single `addMembers(members[])` method) would be more efficient. Acceptable for MVP but worth noting for future optimization.
3. **No error specificity.** All handlers throw `new Error("...")`. Consider custom error classes (e.g., `NotFoundError`, `ConflictError`) to let Route Handlers map to appropriate HTTP status codes without string matching.

### Test Coverage
- All plan-required test cases are present.
- **Missing edge case for RemoveGroupMember:** No test for removing from a non-existent group. Would currently succeed silently.
- **Missing edge case for RemoveGroupMember:** No test for removing a non-member userId. Would currently succeed silently.
- **Missing edge case for CreateGroup:** No test for creating a group with duplicate userIds in `memberIds` (e.g., `["u2", "u2"]`). The Set dedup handles creator dedup, but duplicate non-creator IDs in the array would also be deduped by the Set. This works correctly but is untested.
- All tests properly use `beforeEach` for isolation and reset state.

### Naming & Style
- Consistent naming across all handlers and tests.
- File names are kebab-case matching class names.
- All command/query fields use `readonly`.
- Tests use descriptive `it("...")` descriptions.
- No unnecessary comments — code is self-documenting.

## Verdict

**Spec Compliance:** PASS_WITH_CONCERNS
**Code Quality:** PASS_WITH_CONCERNS

## Summary
All five group handlers and their tests match the plan exactly and implement the core spec requirements correctly. Two minor concerns: `RemoveGroupMemberHandler` does not validate group/member existence before attempting removal (silent no-op on invalid input), and all handlers use generic `Error` throws that will require string-matching in Route Handlers. These are consistent with the plan but represent gaps that should be addressed before the API layer is built.
