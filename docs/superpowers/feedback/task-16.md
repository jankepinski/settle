# Task 16: API Route Handlers — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [x] `src/app/api/auth/register/route.ts` — POST with Zod validation, RegisterCommand, 409 on duplicate email
- [x] `src/app/api/users/route.ts` — GET with GetAllUsersQuery, session-protected
- [x] `src/app/api/groups/route.ts` — POST (CreateGroupCommand, session user as creator) + GET (GetUserGroupsQuery)
- [x] `src/app/api/groups/[id]/route.ts` — GET GetGroupDetailsQuery with membership check (403)
- [x] `src/app/api/groups/[id]/members/route.ts` — POST AddGroupMemberCommand with membership check
- [x] `src/app/api/groups/[id]/members/[userId]/route.ts` — DELETE RemoveGroupMemberCommand with 409 on conflict
- [x] `src/app/api/groups/[id]/expenses/route.ts` — POST CreateExpenseCommand + GET GetGroupExpensesQuery with membership check
- [x] `src/app/api/groups/[id]/balances/route.ts` — GET GetGroupBalancesQuery with membership check
- [x] `src/app/api/groups/[id]/settlements/route.ts` — POST CreateSettlementCommand with membership check
- [x] `src/app/api/expenses/[id]/route.ts` — PUT UpdateExpenseCommand + DELETE DeleteExpenseCommand, settlement rejection (400), membership via expense's groupId
- [x] `src/app/api/settlements/[id]/route.ts` — DELETE DeleteSettlementCommand, membership via expense's groupId
- [x] All group-scoped routes verify membership (403)
- [x] Non-group-scoped routes (`expenses/[id]`, `settlements/[id]`) look up expense's groupId and verify membership
- [x] Zod validation on all POST/PUT request bodies
- [x] Auth check on all protected routes (session required → 401)
- [x] `/api/auth/register` does NOT require auth (correct)
- [x] Middleware excludes `/api/auth/*` from auth enforcement
- [x] Thin route handlers — no business logic, just parse → session → command → handler → response
- [x] `findExpenseById` helper in DI container for non-group-scoped routes

### HTTP Status Codes Audit

| Route | Expected | Actual | Status |
|---|---|---|---|
| POST /api/auth/register success | 201 | 201 | OK |
| POST /api/auth/register duplicate | 409 | 409 | OK |
| POST /api/auth/register bad body | 400 | 400 | OK |
| GET /api/users unauthenticated | 401 | 401 | OK |
| POST /api/groups success | 201 | 201 | OK |
| POST /api/groups bad body | 400 | 400 | OK |
| GET /api/groups/[id] not member | 403 | 403 | OK |
| GET /api/groups/[id] not found | 404 | 404 | OK |
| POST /api/groups/[id]/members success | 200 | 200 | OK |
| DELETE /api/groups/[id]/members/[userId] conflict | 409 | 409 | OK |
| POST /api/groups/[id]/expenses success | 201 | 201 | OK |
| PUT /api/expenses/[id] settlement | 400 | 400 | OK |
| DELETE /api/expenses/[id] settlement | 400 | 400 | OK |
| DELETE /api/settlements/[id] non-settlement | 400 | 400 | OK |

### Deviations from Plan

1. **Register route error handling uses `error instanceof Error` pattern instead of `(error as any).message`** — `src/app/api/auth/register/route.ts:18-19`. The plan used `error: any` but the implementation correctly uses `error: unknown` with a type guard. This is actually an improvement over the plan.

2. **Users route has auth check not in plan** — `src/app/api/users/route.ts:8-9`. The plan's example code for the users endpoint did not include a session check, but the spec states "All endpoints require authentication except /api/auth/*". The implementation correctly adds the check. This is correct behavior, though it deviates from the plan's sample code.

3. **Session user type assertion differs** — Plan used `(session.user as any).id`, implementation uses `(session.user as { id: string }).id` in most files. This is a minor style improvement (typed assertion vs `any`).

### Deviations from Spec

None. All spec requirements for route handlers are met.

## Code Quality Review

### Architecture & Patterns

- **Thin handlers principle fully respected.** Every route handler follows the same clean pattern: parse request → check session → verify membership → create command/query → call handler → return response. Zero business logic leaks into route handlers.
- **Good helper extraction.** The `verifyMembership` helper in `groups/[id]/expenses/route.ts` and `verifyExpenseMembership` helper in `expenses/[id]/route.ts` reduce duplication within their respective files. However, these helpers could be shared across multiple route files to reduce cross-file duplication (e.g., the membership check pattern is repeated in `balances/route.ts`, `settlements/route.ts`, `members/route.ts`, etc.).
- **Composition root design is clean.** The `findExpenseById` export from the container is a pragmatic solution for non-group-scoped routes that need to resolve group membership from an expense ID.

### Code Issues

1. **Minor: Duplicated membership verification pattern across ~6 files.** Each group-scoped route independently calls `getGroupDetails.execute()` and checks membership. This could be extracted to a shared utility, e.g., `verifyGroupMembership(groupId, userId)`. Current approach works but increases maintenance surface.

2. **Error message leakage in 500 responses.** In `src/app/api/auth/register/route.ts:23`, the catch-all branch returns the raw error message to the client (`{ error: message }`). If an unexpected error occurs (e.g., database connection failure), internal details could leak. Same pattern in `expenses/[id]/route.ts:55` where the non-settlement catch block returns `{ error: message }` with status 400 (should arguably be 500 for unexpected errors).

3. **`expenses/[id]/route.ts:50-56` — duplicate catch branches.** Both the `"Cannot update a settlement"` branch and the catch-all return status 400. The catch-all should return 500 for truly unexpected errors, not 400.

4. **Empty catch blocks in membership verification.** Several routes use `catch { return ... "Group not found" }` which swallows the actual error. While acceptable for this thin-layer pattern, it means any error during group lookup (not just "not found") returns 404.

### Test Coverage

No unit or integration tests for route handlers themselves. This is consistent with the plan (route handlers are tested indirectly via manual smoke testing). The underlying handlers and repositories are well-tested in earlier tasks.

### Naming & Style

- Consistent use of `Props` type for route params across all files.
- Consistent `error: unknown` with type guards (modern TypeScript practice).
- Clean import organization.
- `_request` prefix for unused request parameters is idiomatic.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS_WITH_CONCERNS

## Summary

All 11 route handler files are present and correctly implement the spec. Every group-scoped route verifies membership (403). Non-group-scoped routes correctly resolve group membership via the expense's groupId. Zod validation is applied to all request bodies. HTTP status codes match spec requirements. The thin-handler principle is strictly followed with zero business logic in route handlers.

Concerns are minor: duplicated membership verification could be extracted to a shared utility, and some error handling paths leak internal error messages or return 400 where 500 would be more appropriate. These are polish issues, not spec violations.
