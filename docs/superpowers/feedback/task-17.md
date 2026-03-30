# Task 17: Frontend — Layout + Auth Pages — Review Feedback

## Spec Compliance Review

### Requirements Checklist

- [x] shadcn/ui initialized (`components.json` present, style: `base-nova`)
- [x] shadcn components installed: button, input, label, card — confirmed in `src/components/ui/`
- [ ] shadcn `form` component — NOT installed. The `form` component is absent from `src/components/ui/`. Instead, native `<form>` elements are used with manual state management. The plan called for `npx shadcn@latest add form`.
- [x] Toast support — `sonner` (Toaster) installed and wired in layout via `src/components/ui/sonner.tsx`
- [x] `src/lib/format.ts` with `formatCents()` — PLN currency, `pl-PL` locale ✓
- [x] `src/lib/utils.ts` with `cn()` — standard shadcn utility ✓
- [x] `src/app/page.tsx` redirects to `/dashboard` ✓
- [x] `src/app/login/page.tsx` — email + password form, `signIn("credentials")`, Card/Input/Button, link to `/register` ✓
- [x] `src/app/register/page.tsx` — email + name + password form, Zod validation with `registerSchema`, POST to `/api/auth/register`, redirect to `/login` on success ✓
- [x] `src/app/layout.tsx` wrapped with SessionProvider via client component wrapper ✓
- [x] `src/app/providers.tsx` as "use client" SessionProvider wrapper ✓
- [x] Login page is "use client" ✓
- [x] Register page is "use client" ✓
- [x] Tailwind base styles + font configuration in layout ✓

### Deviations from Plan

1. **Login page uses custom `Field`/`FieldGroup`/`FieldLabel`/`FieldError` components instead of shadcn `Label`** — `src/app/login/page.tsx:17-21`. These come from `src/components/ui/field.tsx`, which is a custom component not from the standard shadcn registry. The plan called for `Label` from shadcn. The `label.tsx` exists in `src/components/ui/` but is not used directly on the login/register pages. This is a minor deviation — the custom Field components wrap labels and provide structure.

2. **`form` shadcn component not installed** — The plan specified `npx shadcn@latest add form` but no `form.tsx` exists in `src/components/ui/`. Forms are implemented with native `<form>` elements and manual `useState` handling. This works but doesn't match the plan's intent of using the shadcn form component (which integrates react-hook-form + zod).

3. **Toast uses `sonner` instead of shadcn `toast`** — The plan called for `npx shadcn@latest add toast` but the implementation uses `sonner` (a different toast library). `src/components/ui/sonner.tsx` wraps it. This is a valid alternative (shadcn supports both) but differs from the plan.

### Deviations from Spec

1. **Register page error display reads wrong field from API response** — `src/app/register/page.tsx:65`: The code reads `(data as { message?: string }).message` but the API returns `{ error: "Email already registered" }`. The field is `error`, not `message`. This means when a user registers with a duplicate email, they will see the generic "Registration failed. Please try again." fallback instead of the specific "Email already registered" message from the server.

## Code Quality Review

### Architecture & Patterns

- **Clean separation of concerns.** Layout is a server component, providers are a client component wrapper, pages are client components. This is the correct Next.js App Router pattern.
- **Shared Zod schema reuse.** The register page imports `registerSchema` from `@/shared/validation/auth-schemas` for client-side validation before submitting. This matches the spec's "single source of truth" requirement.
- **`redirect()` in `page.tsx`** uses Next.js server-side redirect, which is correct.

### Code Issues

1. **BUG: Register page doesn't display server error messages** — `src/app/register/page.tsx:65`. The API response uses `{ error: "..." }` but the page reads `data.message`. Should be `(data as { error?: string }).error`. This breaks the 409 duplicate email UX — users see a generic error.

2. **Login page doesn't use Zod validation** — The login page directly calls `signIn()` without validating the form fields through a Zod schema first. While the server will reject invalid input, client-side validation provides better UX. The register page correctly does client-side Zod validation, but login does not. The plan mentions Zod validation for the register page specifically, so this may be intentional.

3. **No loading redirect on login page** — The login page doesn't check `useSession` status to redirect already-authenticated users away from `/login`. If a logged-in user navigates to `/login`, they see the form instead of being redirected to `/dashboard`. The middleware only protects `/dashboard` and `/groups`, not `/login`.

### Test Coverage

No unit tests for frontend pages (consistent with plan — frontend is tested via manual smoke testing).

### Naming & Style

- Consistent use of `"use client"` directive.
- Clean import organization with shadcn components grouped.
- Good use of semantic HTML (form elements, labels with htmlFor).
- Accessible password fields with `autoComplete` attributes.
- Loading states (`pending`) properly disable submit buttons.
- `aria-invalid` attributes on register form fields for accessibility.

## Verdict

**Spec Compliance:** PASS_WITH_CONCERNS
**Code Quality:** PASS_WITH_CONCERNS

## Summary

All required files are present and functional. The layout correctly wraps children with SessionProvider. Login and register pages follow the spec's design using shadcn Card/Input/Button components. The `formatCents()` utility matches the spec exactly. The root page correctly redirects to `/dashboard`.

Primary concern: The register page reads `data.message` instead of `data.error` from the API response (`src/app/register/page.tsx:65`), which means the 409 "Email already registered" error message is never displayed to the user. This is a functional bug that impacts the registration UX. Secondary concern: the shadcn `form` component was not installed per plan, though the manual form implementation is functional.
