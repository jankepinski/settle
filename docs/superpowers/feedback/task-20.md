# Task 20: Final Cleanup and Verification — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [ ] **All unit + integration tests pass** — Cannot verify (requires Docker for integration tests). The final commit message "chore: final cleanup and lint fixes" implies tests were addressed, but no test output is available for review.
- [ ] **Lint clean** — The final commit message suggests lint issues were fixed. Cannot verify current lint status without running `npm run lint`.
- [ ] **Manual smoke test flow documented** — No documentation of the smoke test results is present in the repo. The plan asks for this flow to be executed:
  1. Register user A and user B
  2. Log in as A
  3. Create group "Dinner" with A and B
  4. Add expense: A paid 100 PLN, participants A + B
  5. Check balances: A = +50 PLN, B = -50 PLN
  6. Settle: B pays A 50 PLN
  7. Check balances: both 0

### Deviations from Plan

1. **Smoke test would fail due to Task 19 bugs** — Steps 4-7 of the manual smoke test require creating expenses and settlements. As documented in the Task 19 review, three critical field name mismatches (`paidBy` vs `paidById`, `payerId` vs `paidById`) and an HTTP method mismatch (PATCH vs PUT) mean these operations will fail with 400/405 errors from the frontend. If the smoke test was actually performed end-to-end, it would have failed at step 4. This suggests either:
   - The smoke test was not fully performed, or
   - The smoke test was done via API tools (curl/Postman) rather than through the UI, or
   - The bugs were introduced after the smoke test was done

2. **No test output artifacts** — The plan says to run `npm run test` and verify all tests pass. There is no record of test results in the commit history or as a file in the repo.

### Deviations from Spec

1. **Incomplete verification** — The spec's verification flow cannot succeed through the UI due to frontend-backend field name mismatches identified in Task 19.

## Code Quality Review

### Architecture & Patterns

- **Git history is clean and well-structured.** 21 commits with clear, conventional commit messages (`feat:`, `test:`, `chore:`, `fix:`). Each commit corresponds to a logical task.
- **The fix commit `e6feaaf`** ("fix: add group membership check to non-group-scoped expense/settlement routes") shows that access control was retroactively added for `expenses/[id]` and `settlements/[id]` routes — this is good that it was caught and fixed.
- **Final commit** cleans up lint issues, which is the expected last step.

### Code Issues

1. **Outstanding critical bugs from Task 19 not caught** — The three field name mismatches and PATCH/PUT mismatch are still present in the final codebase. The cleanup pass did not catch these runtime integration issues.

2. **Register page error field mismatch from Task 17 not caught** — `src/app/register/page.tsx:65` reads `data.message` but the API returns `{ error: ... }`. The 409 duplicate email message is still not displayed correctly.

### Test Coverage

The project has 17 test files:
- **13 unit tests** covering all command/query handlers + split calculator
- **3 integration tests** covering all Drizzle repository implementations
- **1 domain test** for split calculator

Missing test coverage:
- No tests for route handlers (API layer)
- No tests for frontend components
- No tests for validation schemas
- No end-to-end tests

This coverage level is consistent with the plan (unit tests for handlers, integration tests for repos, manual testing for frontend and API). However, the field name mismatches would have been caught by even basic API-level integration tests.

### Naming & Style

- Commit messages follow conventional commit format consistently.
- Final lint pass ensures code style consistency.

## Verdict

**Spec Compliance:** FAIL
**Code Quality:** PASS_WITH_CONCERNS

## Summary

The final cleanup task addressed lint issues and the git history is clean with well-structured conventional commits. However, the verification step is incomplete: the manual smoke test flow described in the plan (register → create group → add expense → check balances → settle → verify zero balances) cannot succeed through the UI due to three critical field name mismatches between the frontend and backend Zod schemas identified in Task 19:

| Frontend sends | Zod expects | Affected operation |
|---|---|---|
| `paidBy` | `paidById` | Create/Edit expense |
| `payerId` | `paidById` | Create settlement |
| HTTP `PATCH` | HTTP `PUT` | Edit expense |

Additionally, the register page error field mismatch (`data.message` vs `data.error`) from Task 17 was not caught during cleanup.

The overall project architecture is solid, the backend layer (domain, application, infrastructure, route handlers) is correct and well-tested, and the frontend structure is sound. The critical issues are isolated to three field name typos and one HTTP method mismatch in the group detail page, which could be fixed in minutes. However, since the task's primary purpose is verification and these bugs represent a broken end-to-end flow, the task cannot pass as-is.

### Recommended Fixes

1. `src/app/groups/[id]/page.tsx:214` — Change `method: "PATCH"` to `method: "PUT"`
2. `src/app/groups/[id]/page.tsx:217,230` — Change `paidBy:` to `paidById:`
3. `src/app/groups/[id]/page.tsx:287` — Change `payerId:` to `paidById:`
4. `src/app/register/page.tsx:65` — Change `data.message` to `data.error`
