# Task 07: Zod Validation Schemas — Review Feedback

## Spec Compliance Review

### Requirements Checklist

**auth-schemas.ts** (`src/shared/validation/auth-schemas.ts`)
- [x] `registerSchema` — object with email, name, password
- [x] `email` — `z.string().email()`
- [x] `name` — `z.string().min(1).max(255)`
- [x] `password` — `z.string().min(8).max(128)`
- [x] `loginSchema` — object with email, password
- [x] `email` — `z.string().email()`
- [x] `password` — `z.string().min(1)`
- [x] Exported types: `RegisterInput`, `LoginInput`

**group-schemas.ts** (`src/shared/validation/group-schemas.ts`)
- [x] `createGroupSchema` — object with name, memberIds
- [x] `name` — `z.string().min(1).max(255)`
- [x] `memberIds` — `z.array(z.string().uuid()).default([])`
- [x] `addGroupMemberSchema` — object with userId
- [x] `userId` — `z.string().uuid()`
- [x] Exported types: `CreateGroupInput`, `AddGroupMemberInput`

**expense-schemas.ts** (`src/shared/validation/expense-schemas.ts`)
- [x] `createExpenseSchema` — object with paidById, amount, description, participantIds
- [x] `paidById` — `z.string().uuid()`
- [x] `amount` — `z.number().int().positive()`
- [x] `description` — `z.string().min(1).max(500)`
- [x] `participantIds` — `z.array(z.string().uuid()).min(1)`
- [x] `updateExpenseSchema` — same fields as createExpenseSchema
- [x] `createSettlementSchema` — object with paidById, recipientId, amount
- [x] `paidById` — `z.string().uuid()`
- [x] `recipientId` — `z.string().uuid()`
- [x] `amount` — `z.number().int().positive()`
- [x] Exported types: `CreateExpenseInput`, `UpdateExpenseInput`, `CreateSettlementInput`

### Deviations from Plan
- None. Every schema, field constraint, and type export is an exact match to the plan.

### Deviations from Spec
- None. The spec requires "Zod schemas shared between frontend and Route Handlers" — schemas are defined once in `src/shared/validation/` and are importable by both layers.
- Amounts use `z.number().int().positive()` which enforces the "integer, in cents" requirement.
- UUIDs are validated with `z.string().uuid()` matching the "UUIDs for IDs" requirement.

## Code Quality Review

### Architecture & Patterns
- Schemas live in `src/shared/validation/`, correctly placed in the shared layer accessible to both API route handlers and frontend forms.
- Each domain area (auth, groups, expenses) has its own schema file — follows feature-sliced organization.
- Type inference via `z.infer<>` ensures types stay in sync with schemas — single source of truth.

### Code Issues
- **`updateExpenseSchema` is a duplicate of `createExpenseSchema`.** Both have identical field definitions. This is intentional per the plan (the spec says "UpdateExpenseCommand via PUT is a full replacement — all fields must be provided"), but could use `createExpenseSchema` as a base to reduce duplication. The plan explicitly defines them separately, so this matches requirements.
- No other issues. All constraints are correct and complete.

### Test Coverage
- No dedicated unit tests for schemas. This is consistent with the plan, which does not include schema tests. Schemas will be exercised through Route Handler integration and frontend form tests in later tasks. The constraints are simple enough that Zod's own test suite provides coverage for the validation logic.

### Naming & Style
- File names follow `[domain]-schemas.ts` convention consistently.
- Schema names follow `[action]Schema` convention (e.g., `createGroupSchema`, `loginSchema`).
- Type names follow `[Action]Input` convention (e.g., `RegisterInput`, `CreateExpenseInput`).
- All files import from `zod` — single dependency, no unnecessary imports.

## Verdict

**Spec Compliance:** PASS
**Code Quality:** PASS

## Summary
All three schema files match the plan and spec exactly. Field constraints correctly enforce integer-cent amounts, UUID identifiers, and string length limits. Types are derived from schemas via `z.infer<>`, maintaining a single source of truth for validation rules shared between frontend and backend.
