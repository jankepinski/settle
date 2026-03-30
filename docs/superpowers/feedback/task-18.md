# Task 18: Frontend — Dashboard Page — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [x] `src/app/dashboard/page.tsx` exists as "use client" component
- [x] Fetches `GET /api/groups` on mount (via `fetchGroups` in useEffect when authenticated)
- [x] Displays groups as Cards (group name shown)
- [ ] **Member count on group cards** — The plan says "group name, member count" but the cards only show group name and creation date. Member count is not displayed. The `Group` type only has `id`, `name`, `createdBy`, `createdAt` — no member count field. The `GET /api/groups` endpoint returns `GetUserGroupsQuery` results which likely don't include member counts.
- [x] "New Group" button opens a dialog with group name input
- [x] User multi-select from `GET /api/users` — checkbox-based selection of other users
- [x] Clicking a group navigates to `/groups/[id]` (via `router.push`)
- [x] Loading states — skeleton placeholders shown while groups load
- [x] Empty state — "No groups yet" message with icon when no groups exist
- [x] Dialog for creating groups with name + member selection
- [x] After creating a group, data is refetched (`fetchGroups()`)

### Deviations from Plan

1. **No member count on group cards** — `src/app/dashboard/page.tsx:237-249`. The plan specifies "group name, member count" for each card, but the implementation shows "group name, creation date". The `GET /api/groups` response (from `GetUserGroupsQuery`) returns `Group[]` which does not include a member count. To show member count, either the query would need to be enriched or a separate fetch per group would be needed.

2. **Plan calls for Dialog + Select/MultiSelect, implementation uses Dialog + Checkbox** — `src/app/dashboard/page.tsx:186-203`. The plan says "user multi-select from GET /api/users" which could mean a multi-select dropdown. The implementation uses checkboxes, which is a valid and arguably better UX for member selection. Minor deviation.

3. **Users are fetched only when dialog opens** — `src/app/dashboard/page.tsx:156-157`. The `fetchUsers` call is triggered by `onOpenChange` of the Dialog, not on page mount. This is actually a good optimization (lazy loading), though it means there's no loading state for users inside the dialog.

### Deviations from Spec

1. **Missing member count** — The spec says dashboard shows "groups list as Cards" and the plan clarifies "group name, member count". The implementation shows creation date instead. This is a minor spec gap.

## Code Quality Review

### Architecture & Patterns

- **Good auth-aware rendering.** The page checks `useSession` status and redirects unauthenticated users to `/login`. It shows a skeleton during the loading state. This is a solid client-side auth pattern.
- **Proper callback memoization.** `fetchGroups` and `fetchUsers` are wrapped in `useCallback` to avoid infinite re-render loops with `useEffect` dependencies.
- **Sign out button in header** — Good UX addition not explicitly in the plan but sensible.
- **Toast notifications** for success/failure states.

### Code Issues

1. **No error handling on failed group creation body** — `src/app/dashboard/page.tsx:101`. When `POST /api/groups` fails, the error body is not read — the user just sees a generic "Failed to create group" toast. For Zod validation errors (400), the specific field errors are lost. Low severity since group creation only has `name` and `memberIds`.

2. **Users filter excludes current user** — `src/app/dashboard/page.tsx:122`. Good: the current user is correctly filtered out of the member selection list since the creator is auto-added by the backend.

3. **No loading indicator inside the "New Group" dialog for users** — When the dialog opens and `fetchUsers` is called, there's no skeleton or spinner while users load. If the network is slow, the user sees an empty member list briefly.

### Test Coverage

No unit tests for the dashboard page (consistent with plan — frontend is tested via manual smoke testing).

### Naming & Style

- Clean component structure with logical sections (header, main content).
- Good use of Lucide icons (`PlusIcon`, `UsersIcon`).
- Responsive layout with `max-w-2xl mx-auto`.
- Skeleton loading states are visually consistent.
- `data-icon="inline-start"` attribute on PlusIcon for proper icon alignment (shadcn convention).

## Verdict

**Spec Compliance:** PASS_WITH_CONCERNS
**Code Quality:** PASS

## Summary

The dashboard page is well-implemented with proper auth checking, loading states, empty states, group creation dialog with multi-select members, and navigation to group detail. The main spec concern is the missing member count on group cards — the plan explicitly calls for "group name, member count" but the implementation shows "group name, creation date" instead. This is partially a data availability issue (the groups endpoint doesn't return member count), not just a display omission. The code quality is clean with proper memoization, error handling via toasts, and good UX patterns.
