# Task 19: Frontend — Group Detail Page — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [x] `src/app/groups/[id]/page.tsx` exists as "use client" component
- [x] **Balances section** — fetches `GET /api/groups/[id]/balances`, displays each member with balance
- [x] Green/red indicators on balances — uses Badge with `default` (positive), `destructive` (negative), `secondary` (zero)
- [x] Uses `formatCents()` from `@/lib/format` for currency display
- [x] **Expenses section** — fetches `GET /api/groups/[id]/expenses`, lists expenses with description, amount, payer
- [x] Settlements displayed differently — shows "Settlement" label with "X → Y · amount" format
- [x] Edit button on expenses (not on settlements) — PencilIcon, opens pre-filled dialog
- [x] Delete button on all items — uses correct endpoint (`DELETE /api/expenses/[id]` for expenses, `DELETE /api/settlements/[id]` for settlements)
- [x] "Add Expense" button opens dialog with payer select, amount, description, participant checkboxes
- [x] "Settle Up" button opens settlement form with payer select, recipient select, amount
- [x] Settle form filters out payer from recipient list — `members.filter((m) => m.userId !== settlePayerId)`
- [x] **Members section** — fetches `GET /api/groups/[id]`, lists members
- [x] "Add Member" button — select from non-member users
- [x] "Remove" button per member — calls DELETE with 409 toast on conflict
- [x] All mutations refetch data after success (expenses + balances refetched after expense/settlement changes, details refetched after member changes)
- [x] Loading states with skeletons for all three sections
- [x] Empty states for balances, expenses, and members

### Deviations from Plan

1. **Participant display missing from expense list** — The plan says "list with description/amount/payer/participants" but the expense list only shows description, amount, and payer. Participant names are not shown in the expense list items (`src/app/groups/[id]/page.tsx:454-468`). The splits data is available but only used for edit mode pre-population.

### Deviations from Spec

1. **CRITICAL BUG: Edit expense uses PATCH instead of PUT** — `src/app/groups/[id]/page.tsx:214`. The frontend sends `method: "PATCH"` but the API route only exports `PUT` (`src/app/api/expenses/[id]/route.ts:25`). This will result in a **405 Method Not Allowed** error. Every attempt to edit an expense from the UI will fail silently (the catch block shows a generic "Failed to save expense" toast).

2. **CRITICAL BUG: Frontend sends `paidBy` but Zod schema expects `paidById`** — `src/app/groups/[id]/page.tsx:217,230`. When creating or editing an expense, the frontend sends `{ paidBy: ..., amount: ..., description: ..., participantIds: [...] }` but the Zod schemas (`createExpenseSchema` and `updateExpenseSchema` in `src/shared/validation/expense-schemas.ts:4,11`) expect `paidById`. Since `paidBy` is not in the schema and `paidById` is required, Zod validation will **always reject** the request body with a 400 error. **No expense can be created or edited from the UI.**

3. **CRITICAL BUG: Settlement form sends `payerId` but Zod schema expects `paidById`** — `src/app/groups/[id]/page.tsx:287`. The frontend sends `{ payerId: ..., recipientId: ..., amount: ... }` but `createSettlementSchema` (`src/shared/validation/expense-schemas.ts:18`) expects `paidById`. Zod will reject every settlement creation with 400. **No settlement can be recorded from the UI.**

4. **No auth check on group detail page** — The group detail page does not use `useSession` to check authentication status or redirect unauthenticated users. The dashboard page does this (`src/app/dashboard/page.tsx:55-59`), but the group detail page relies solely on the middleware for protection. The middleware does protect `/groups/:path*`, so this works, but it means no loading state for the auth check — the page immediately starts fetching data which may fail with 401 if the session is expired.

## Code Quality Review

### Architecture & Patterns

- **Good section organization.** The page cleanly separates Balances, Expenses, and Members into distinct `<section>` elements with clear headers.
- **Proper data refetching pattern.** After mutations (create/edit/delete expense, add/remove member, settle up), the relevant data is refetched. Expense and settlement mutations refetch both expenses and balances. Member mutations refetch details.
- **Dialog state management is thorough.** Edit expense pre-fills all fields from the existing expense data. New expense defaults all members as participants.
- **Helper function `getUserName`** resolves user IDs to names using the `allUsers` list, with a fallback to truncated UUID.

### Code Issues

1. **CRITICAL: Three field name mismatches between frontend and backend** — See Deviations from Spec #2 and #3 above. The frontend sends `paidBy`/`payerId` but the Zod schemas expect `paidById`. This breaks all create expense, edit expense, and create settlement operations.

2. **CRITICAL: PATCH vs PUT mismatch** — See Deviation #1. The edit expense request uses PATCH but the route only handles PUT.

3. **Amount conversion inconsistency** — `src/app/groups/[id]/page.tsx:191`. When opening the edit dialog, the amount is converted from cents to decimal for display: `(item.expense.amount / 100).toFixed(2)`. When submitting, it converts back: `Math.round(parseFloat(expenseAmount) * 100)`. This round-trip could introduce floating-point errors for certain values (e.g., 19999 cents → "199.99" → 19999 cents is fine, but edge cases with very large numbers could drift). Acceptable for MVP.

4. **No form validation with Zod on the frontend** — The plan says "All forms validate with shared Zod schemas" but the group detail page does not import or use any Zod schemas for client-side validation. The expense and settlement forms use manual `if (!expensePayerId || ...)` checks instead. The register page correctly uses Zod client-side, but this page does not.

5. **Expense description not required in the form** — `src/app/groups/[id]/page.tsx:606-609`. The description input is not marked `required`, but the `createExpenseSchema` requires `description: z.string().min(1)`. This means a user could submit an empty description, which would be rejected by the server. The form should either mark description as required or the schema should allow empty strings.

6. **No confirmation dialog for delete actions** — Delete expense, delete settlement, and remove member actions execute immediately without a confirmation step. This is a UX concern, not a spec violation.

### Test Coverage

No unit tests for the group detail page (consistent with plan — frontend is tested via manual smoke testing).

### Naming & Style

- Well-structured 780-line component — large but logically organized.
- Good use of TypeScript types for API responses (`GroupDetails`, `Balance`, `ExpenseWithSplits`, etc.).
- Consistent use of shadcn components (Dialog, Select, Checkbox, Badge, Separator, Skeleton).
- Accessible: sr-only labels on icon buttons, proper form labeling.
- `data-icon="inline-start"` for icon alignment.

## Verdict

**Spec Compliance:** FAIL
**Code Quality:** FAIL

## Summary

The group detail page has the correct structure with all three required sections (Balances, Expenses, Members) and all the required dialogs (Add Expense, Edit Expense, Settle Up, Add Member). Loading states, empty states, and data refetching are properly implemented. The settlement display differentiates from regular expenses. Delete and edit buttons are correctly placed.

However, **three critical bugs make the page non-functional for core operations:**

1. **PATCH vs PUT mismatch** (`page.tsx:214`): Edit expense sends PATCH but the API route only handles PUT → 405 error.
2. **`paidBy` vs `paidById` field name mismatch** (`page.tsx:217,230`): Create and edit expense send `paidBy` but Zod expects `paidById` → 400 error on every attempt.
3. **`payerId` vs `paidById` field name mismatch** (`page.tsx:287`): Settle up sends `payerId` but Zod expects `paidById` → 400 error on every attempt.

These three bugs mean **no expenses can be created, edited, or settled from the UI**. The core functionality of the application is broken. These must be fixed before the task can pass.
