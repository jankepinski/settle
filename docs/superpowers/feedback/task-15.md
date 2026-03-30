# Task 15: NextAuth Configuration + Middleware — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**auth-options.ts** (`src/shared/infrastructure/auth/auth-options.ts`)
- [x] Exports `authOptions` as `NextAuthOptions`
- [x] Uses `CredentialsProvider`
- [x] Credential fields: `email` (type email) and `password` (type password)
- [x] `authorize`: validates credentials exist, queries DB for user by email
- [x] `authorize`: uses `bcryptjs.compare` for password verification
- [x] `authorize`: returns `{ id, email, name }` on success, `null` on failure
- [x] `session.strategy` set to `"jwt"`
- [x] `jwt` callback: adds `user.id` to `token.id`
- [x] `session` callback: adds `token.id` to `session.user.id`
- [x] `pages.signIn` set to `"/login"`

**route.ts** (`src/app/api/auth/[...nextauth]/route.ts`)
- [x] Imports `NextAuth` from `"next-auth"`
- [x] Imports `authOptions` from shared auth module
- [x] Creates handler via `NextAuth(authOptions)`
- [x] Exports `GET` and `POST` handlers

**middleware.ts** (project root)
- [x] Exports default from `"next-auth/middleware"`
- [x] Protects `/dashboard/:path*`
- [x] Protects `/groups/:path*`
- [x] Protects `/api/users/:path*`
- [x] Protects `/api/groups/:path*`
- [x] Protects `/api/expenses/:path*`
- [x] Protects `/api/settlements/:path*`

### Deviations from Plan

1. **Typed session interface** (`auth-options.ts:8-10`): The plan uses `(session.user as any).id = token.id as string` in the session callback. The implementation defines a `SessionWithId` interface extending `Session` with a typed `id` field, and uses it as the return type of the session callback. This is a **positive deviation** — replaces unsafe `as any` cast with proper typing.

2. **Session callback return type** (`auth-options.ts:47`): The implementation declares the session callback as `async session(...): Promise<SessionWithId>`. The plan does not specify a return type. This is a minor enhancement for type safety.

### Deviations from Spec

1. **`authorize` queries DB directly instead of using repository**: The `authorize` function does `db.select().from(users).where(eq(users.email, ...))` — directly using Drizzle queries instead of `IUserRepository.findByEmail()`. The spec says "Repository implementations use Drizzle ORM behind domain interfaces" and the architecture is Clean Architecture. Bypassing the repository in the auth layer is a pragmatic choice (avoids circular dependency with the composition root), but it introduces a second code path for "find user by email" that isn't tested through the repository interface. The plan explicitly specifies this approach, so it's plan-conformant but architecturally impure.

2. **No NEXTAUTH_SECRET configuration**: The `authOptions` object doesn't set a `secret` property. NextAuth v4 requires `NEXTAUTH_SECRET` environment variable or `secret` in options for JWT encryption. The `.env.local` file has `NEXTAUTH_SECRET=dev-secret-change-in-production`, so NextAuth will pick it up from the environment. This is fine but worth noting — production deployments must set this env var.

## Code Quality Review

### Architecture & Patterns

- The auth configuration is cleanly separated into its own file under `src/shared/infrastructure/auth/`, matching the project structure.
- The `[...nextauth]/route.ts` is minimal — just wires authOptions into the NextAuth handler. Good.
- Middleware uses the standard NextAuth middleware export pattern with a `config.matcher` array. Clean and idiomatic.

### Code Issues

1. **`SessionWithId` interface is private to this file** (`auth-options.ts:8-10`): Route handlers that need `session.user.id` will still need their own type assertion (e.g., `(session.user as any).id`). For this type to be useful project-wide, it should be exported or NextAuth's types should be augmented via `next-auth.d.ts` module declaration. The plan's Task 16 route handlers use `(session.user as any).id`, confirming this gap exists.

2. **Middleware matcher patterns**: The matchers use Next.js path patterns correctly. `/api/users/:path*` matches `/api/users` and all sub-paths. One note: `/api/auth/*` routes are NOT in the matcher (correctly excluded per spec — login and register must be public).

3. **No error handling in `authorize`**: If the database query throws (e.g., connection failure), the error will propagate to NextAuth which returns a generic error page. This is acceptable for MVP — NextAuth handles authorize errors gracefully.

4. **Password comparison timing**: `bcryptjs.compare` is used correctly. It's a constant-time comparison, preventing timing attacks. Good.

### Test Coverage

No unit or integration tests for the auth configuration, middleware, or NextAuth route handler. This is expected — NextAuth configuration is typically validated through E2E or manual testing. The `authorize` function could theoretically be extracted and unit tested, but this is beyond MVP scope.

### Naming & Style

- `authOptions` is the conventional NextAuth export name. Good.
- `SessionWithId` is a clear, descriptive name.
- File placement follows plan structure exactly.
- Middleware at project root (`middleware.ts`) is the correct Next.js convention.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS_WITH_CONCERNS

## Summary

NextAuth configuration is complete and correct: CredentialsProvider with bcryptjs, JWT strategy, proper callbacks for userId propagation, and custom sign-in page. The middleware correctly protects all required routes while leaving `/api/auth/*` public. The main positive deviation is the `SessionWithId` typed interface replacing the plan's `as any` cast. Two concerns: (1) the `SessionWithId` type isn't exported or declared globally via `next-auth.d.ts`, so route handlers still need `as any` casts — the type safety improvement is local only; (2) the `authorize` function bypasses the repository layer by querying Drizzle directly, which is architecturally impure but pragmatic. Neither concern is blocking.
