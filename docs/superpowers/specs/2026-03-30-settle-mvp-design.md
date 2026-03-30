# Settle MVP — Design Spec

## Overview

Simplified Splitwise clone. MVP scope: registration, login, groups, expenses split equally. All registered users are visible to each other (no friends system). Architecture designed for future extensibility (friends, direct expenses, custom split types, summary views).

## Tech Stack

- **Framework:** Next.js (App Router, monorepo)
- **Auth:** NextAuth.js (Auth.js) with credentials provider
- **ORM:** Drizzle ORM behind repository interfaces
- **Database:** PostgreSQL 16 via Docker
- **UI:** shadcn/ui + Tailwind CSS
- **Architecture:** Clean Architecture, feature-sliced, CQRS
- **DI:** Manual "poor man's DI" with composition root
- **API:** Route Handlers only (no Server Actions)

## Domain Model

### Entities

**User**
| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | PK |
| email | string | unique |
| name | string | |
| passwordHash | string | |
| createdAt | Date | |

**Group**
| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | PK |
| name | string | |
| createdBy | string | FK → User |
| createdAt | Date | |

**GroupMember**
| Field | Type | Notes |
|---|---|---|
| groupId | string | FK → Group |
| userId | string | FK → User |
| joinedAt | Date | |

**Expense**
| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | PK |
| groupId | string | FK → Group |
| paidBy | string | FK → User (who paid) |
| amount | number | integer, in cents (grosz) |
| description | string | |
| createdAt | Date | |

**ExpenseSplit**
| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | PK |
| expenseId | string | FK → Expense |
| userId | string | FK → User (who owes) |
| amount | number | integer, in cents |

### Relationships

- User ↔ Group: many-to-many through GroupMember
- Group → Expense: one-to-many
- Expense → ExpenseSplit → User: each expense split into per-user amounts

### Key Design Decisions

**ExpenseSplit exists from day one.** In MVP all expenses split equally, but splits are stored as explicit records. Future split types (percentage, shares, fixed amounts) only change the logic that *creates* splits — reads and balance calculations always work from ExpenseSplit records.

**Amounts in cents (integer).** Avoids floating-point precision issues. 25.50 PLN = 2550. Frontend formats for display.

**Not all group members participate in every expense.** Participants are selected when creating an expense. Only participants get ExpenseSplit records. New group members are not retroactively added to existing expenses.

**Expenses are editable.** Adding/removing participants or changing amounts triggers a full recalculation of splits for that expense.

## Application Layer (CQRS)

### Auth Feature

| Type | Name | Input | Output |
|---|---|---|---|
| Command | RegisterCommand | email, name, password | userId |
| Query | GetAllUsersQuery | — | User[] |

### Groups Feature

| Type | Name | Input | Output |
|---|---|---|---|
| Command | CreateGroupCommand | name, memberIds | groupId |
| Command | AddGroupMemberCommand | groupId, userId | void |
| Command | RemoveGroupMemberCommand | groupId, userId | void |
| Query | GetUserGroupsQuery | userId | Group[] |
| Query | GetGroupDetailsQuery | groupId | Group + members |

### Expenses Feature

| Type | Name | Input | Output |
|---|---|---|---|
| Command | CreateExpenseCommand | groupId, paidById, amount, description, participantIds | expenseId |
| Command | UpdateExpenseCommand | expenseId, amount?, description?, paidById?, participantIds? | void |
| Command | DeleteExpenseCommand | expenseId | void |
| Query | GetGroupExpensesQuery | groupId | Expense[] with splits |
| Query | GetGroupBalancesQuery | groupId | member balances |

### Pattern

Each command/query is a class. Each has a dedicated handler class. Handlers receive repository interfaces via constructor injection.

```typescript
class CreateExpenseCommand {
  constructor(
    public readonly groupId: string,
    public readonly paidById: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly participantIds: string[],
  ) {}
}

class CreateExpenseHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: CreateExpenseCommand): Promise<string> {
    // validate, create entity, compute equal splits, persist
  }
}
```

### Repository Interfaces (defined in domain layer)

- `IUserRepository` — findById, findByEmail, findAll, save
- `IGroupRepository` — findById, findByUserId, save, addMember, removeMember
- `IExpenseRepository` — findById, findByGroupId, save, update, delete
- `IExpenseSplitRepository` — findByExpenseId, findByGroupId, saveMany, deleteByExpenseId

## Infrastructure

### Database

- PostgreSQL 16 via `docker-compose.yml`
- Drizzle ORM for schema definition, migrations, and queries
- Repository implementations use Drizzle client, hidden behind domain interfaces

### Dependency Injection

Manual composition root in `src/shared/infrastructure/di/`. Single file that instantiates repositories and wires them into handlers. Imported by Route Handlers.

### Auth

NextAuth.js configured with credentials provider. Session-based auth. `app/api/auth/[...nextauth]/route.ts` handles login/logout/session. Registration is a separate endpoint (`POST /api/auth/register`). Middleware protects authenticated routes.

## API (Route Handlers)

| Method | Path | Handler |
|---|---|---|
| POST | /api/auth/register | RegisterCommand |
| GET | /api/users | GetAllUsersQuery |
| POST | /api/groups | CreateGroupCommand |
| GET | /api/groups | GetUserGroupsQuery |
| GET | /api/groups/[id] | GetGroupDetailsQuery |
| POST | /api/groups/[id]/members | AddGroupMemberCommand |
| DELETE | /api/groups/[id]/members/[userId] | RemoveGroupMemberCommand |
| POST | /api/groups/[id]/expenses | CreateExpenseCommand |
| GET | /api/groups/[id]/expenses | GetGroupExpensesQuery |
| PUT | /api/expenses/[id] | UpdateExpenseCommand |
| DELETE | /api/expenses/[id] | DeleteExpenseCommand |
| GET | /api/groups/[id]/balances | GetGroupBalancesQuery |

Each Route Handler: parse request → create command/query → call handler → return response. Thin layer, zero business logic.

## Frontend

### Pages

| Route | Description |
|---|---|
| /login | Login form |
| /register | Registration form |
| /dashboard | User's groups list + "new group" button |
| /groups/[id] | Group detail: members, expenses, balances, add/edit expense forms |

### UI

shadcn/ui components + Tailwind CSS. Four pages total. Dashboard is landing after login. Group page is the main workspace — expense list, member balances, forms for adding/editing expenses and managing members.

## Project Structure

```
settle/
  docker-compose.yml
  .env.local
  package.json
  drizzle.config.ts
  next.config.ts
  src/
    app/
      layout.tsx
      page.tsx                              → redirect to /dashboard
      login/page.tsx
      register/page.tsx
      dashboard/page.tsx
      groups/[id]/page.tsx
      api/
        auth/[...nextauth]/route.ts
        auth/register/route.ts
        users/route.ts
        groups/route.ts
        groups/[id]/route.ts
        groups/[id]/members/route.ts
        groups/[id]/members/[userId]/route.ts
        groups/[id]/expenses/route.ts
        groups/[id]/balances/route.ts
        expenses/[id]/route.ts
    features/
      auth/
        domain/                             entities, IUserRepository
        application/                        commands, queries, handlers
        infrastructure/                     DrizzleUserRepository
      groups/
        domain/                             entities, IGroupRepository
        application/                        commands, queries, handlers
        infrastructure/                     DrizzleGroupRepository
      expenses/
        domain/                             entities, IExpenseRepository
        application/                        commands, queries, handlers
        infrastructure/                     DrizzleExpenseRepository
    shared/
      infrastructure/
        db/                                 drizzle client, schema, migrations
        di/                                 composition root
        auth/                               NextAuth config
    components/                             shadcn/ui + shared UI components
    lib/                                    utils, helpers
```

## Future Extensibility

The architecture is designed to accommodate these planned features without structural changes:

- **Friends system:** New `friends` feature folder. "Direct" expenses between friends are groups with exactly 2 members under the hood.
- **Custom split types:** Only the split calculation logic in CreateExpenseCommand/UpdateExpenseCommand changes. ExpenseSplit schema stays the same. Add a `splitType` field to Expense and corresponding strategy logic.
- **Summary views:** New queries (GetUserBalanceSummaryQuery, GetDebtSimplificationQuery) added to existing or new feature folders.
