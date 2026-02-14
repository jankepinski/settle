# Test Plan — Splitwise

## 1. Introduction

- **Project:** Splitwise — a group expense splitting application
- **Stack:** NestJS 11 + Prisma 7 + PostgreSQL 16 (backend), Next.js 16 + React 19 + Tailwind v4 (frontend)
- **Monorepo:** pnpm workspaces (`apps/api`, `apps/web`)

## 2. Testing Philosophy

**Test Pyramid** — most unit tests, fewer integration tests, fewest E2E tests:

```
        /  E2E  \          ← few, expensive, critical paths only
       / Integration \      ← moderate, API + DB
      /    Unit       \    ← many, fast, isolated
```

**Principles:**

- Every new module/component must have tests
- Tests are part of the Definition of Done
- CI blocks merge on failing tests
- Minimum coverage: 80% (backend services), 70% (frontend components)

## 3. Backend — Testing Strategy (`apps/api`)

### 3.1 Tools

| Tool                   | Role                                     |
| ---------------------- | ---------------------------------------- |
| **Jest 30**            | Test runner (already configured)         |
| **@nestjs/testing**    | Creating test modules                    |
| **Supertest**          | HTTP endpoint testing                    |
| **Prisma**             | Isolated tests with database             |
| **Docker Compose**     | Dedicated test database (test profile)   |

### 3.2 Unit Tests (`*.spec.ts`)

**What we test:**

- **Services** — business logic (balance calculation, expense splitting, debt simplification)
- **Guards** — authorization logic
- **Pipes** — input data validation
- **Utils/Helpers** — helper functions

**Conventions:**

- Test file next to source file: `expenses.service.ts` → `expenses.service.spec.ts`
- Mock dependencies (Prisma, other services) via `jest.mock()` or NestJS `overrideProvider()`
- Arrange-Act-Assert pattern

**Example scenarios for the Splitwise domain:**

```typescript
// expenses.service.spec.ts
describe('ExpensesService', () => {
  describe('splitEqually', () => {
    it('should split an expense equally among participants');
    it('should handle indivisible amounts (cents)');
    it('should throw an error when the participant list is empty');
  });

  describe('calculateBalances', () => {
    it('should return zero balances when everyone is settled');
    it('should correctly calculate who owes whom and how much');
    it('should simplify debt chains (A→B→C to A→C)');
  });
});
```

### 3.3 Integration Tests (`*.integration-spec.ts`)

**What we test:**

- Service ↔ database interaction (Prisma)
- NestJS pipeline (controller → pipe → guard → service → DB)
- Database transactions

**Approach:**

- Dedicated PostgreSQL container for tests (Docker Compose test profile)
- Before each test: migrations + test data seeding
- After each test: data cleanup (truncate tables)
- Separate Jest configuration: `jest-integration.json`

**Example scenarios:**

```typescript
// expenses.integration-spec.ts
describe('ExpensesService (integration)', () => {
  it('should create an expense and update balances in a single transaction');
  it('should roll back the transaction when balance update fails');
  it('should correctly handle concurrent expense creation');
});
```

### 3.4 E2E Tests (`test/*.e2e-spec.ts`)

**What we test:**

- Full user paths through the API (HTTP request → response)
- Authentication and authorization
- Request body validation
- HTTP status codes and response format

**Approach:**

- Full NestJS application running in memory
- Supertest for executing HTTP requests
- Dedicated test database

**Example scenarios:**

```typescript
// groups.e2e-spec.ts
describe('Groups API (e2e)', () => {
  describe('POST /groups', () => {
    it('201 — should create a group for an authenticated user');
    it('401 — should reject an unauthenticated user');
    it('400 — should validate required fields');
  });

  describe('POST /groups/:id/expenses', () => {
    it('201 — should add an expense and update balances');
    it('403 — should reject a user who is not a group member');
  });

  describe('GET /groups/:id/balances', () => {
    it('200 — should return correct group balances');
  });

  describe('POST /groups/:id/settle', () => {
    it('200 — should settle a debt between two users');
  });
});
```

### 3.5 Directory Structure (backend)

```
apps/api/
├── src/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts          ← unit
│   │   ├── auth.guard.ts
│   │   └── auth.guard.spec.ts            ← unit
│   ├── groups/
│   │   ├── groups.service.ts
│   │   ├── groups.service.spec.ts        ← unit
│   │   ├── groups.controller.ts
│   │   └── groups.controller.spec.ts     ← unit
│   ├── expenses/
│   │   ├── expenses.service.ts
│   │   ├── expenses.service.spec.ts      ← unit
│   │   └── expenses.integration-spec.ts  ← integration
│   └── settlements/
│       ├── settlements.service.ts
│       └── settlements.service.spec.ts   ← unit
├── test/
│   ├── app.e2e-spec.ts                   ← e2e
│   ├── groups.e2e-spec.ts                ← e2e
│   ├── expenses.e2e-spec.ts              ← e2e
│   ├── settlements.e2e-spec.ts           ← e2e
│   ├── jest-e2e.json
│   ├── jest-integration.json
│   └── helpers/
│       ├── test-db.ts                    ← setup/teardown DB
│       └── test-fixtures.ts              ← test data factories
```

## 4. Frontend — Testing Strategy (`apps/web`)

### 4.1 Tools to Install

| Tool                               | Role                                          |
| ---------------------------------- | --------------------------------------------- |
| **Vitest**                         | Test runner (native Vite/Next.js integration) |
| **React Testing Library**          | Testing React components                      |
| **@testing-library/user-event**    | Simulating user interactions                  |
| **MSW (Mock Service Worker)**      | Mocking API in tests                          |
| **Playwright**                     | Browser E2E tests                             |

### 4.2 Component Unit Tests (`*.test.tsx`)

**What we test:**

- Component rendering with various props
- User interactions (clicks, forms)
- Conditional states (loading, error, empty state)
- Custom hook logic

**Conventions:**

- Test file next to component: `ExpenseForm.tsx` → `ExpenseForm.test.tsx`
- Test behavior, not implementation (no `querySelector`, yes `getByRole`)
- User-centric queries (getByRole, getByLabelText, getByText)

**Example scenarios:**

```typescript
// ExpenseForm.test.tsx
describe('ExpenseForm', () => {
  it('should render the form with required fields');
  it('should validate the amount (number > 0)');
  it('should allow selecting expense participants');
  it('should display a validation error when description is empty');
  it('should call onSubmit with valid data');
  it('should disable the button while submitting');
});

// BalancesList.test.tsx
describe('BalancesList', () => {
  it('should display "All settled up" when there are no debts');
  it('should display a list of debts with amounts');
  it('should highlight positive and negative balances with color');
});
```

### 4.3 Integration Tests (components + API)

**What we test:**

- Data flow: component → API call → UI update
- Network error handling
- Loading states

**Approach:**

- MSW to intercept HTTP requests
- Testing full pages (not isolated components)

```typescript
// GroupPage.test.tsx
describe('GroupPage', () => {
  it('should load and display group expenses');
  it('should display an error message on API 500');
  it('should add an expense and refresh the list');
  it('should display a skeleton loader while loading');
});
```

### 4.4 E2E Tests (Playwright)

**What we test:**

- Critical end-to-end user paths
- Cross-browser (Chromium, Firefox, WebKit)
- Responsiveness (mobile, tablet, desktop)

**Example scenarios:**

```typescript
// e2e/expense-flow.spec.ts
test.describe('Full expense cycle', () => {
  test('user logs in, creates a group, adds an expense, and sees balances');
  test('user settles a debt and balances return to zero');
});

// e2e/auth.spec.ts
test.describe('Authentication', () => {
  test('new user registers and logs in');
  test('unauthenticated user is redirected to /login');
});
```

### 4.5 Directory Structure (frontend)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── groups/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseForm.test.tsx          ← unit
│   │   ├── BalancesList.tsx
│   │   ├── BalancesList.test.tsx         ← unit
│   │   ├── GroupCard.tsx
│   │   └── GroupCard.test.tsx            ← unit
│   ├── hooks/
│   │   ├── useExpenses.ts
│   │   └── useExpenses.test.ts           ← unit
│   └── lib/
│       ├── api-client.ts
│       └── api-client.test.ts            ← unit
├── e2e/
│   ├── expense-flow.spec.ts              ← Playwright E2E
│   ├── auth.spec.ts                      ← Playwright E2E
│   └── helpers/
│       └── fixtures.ts
├── vitest.config.ts
└── playwright.config.ts
```

## 5. Database Testing

### 5.1 Isolation Strategy

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: splitwise-db-test
    ports:
      - "5433:5432"     # different port than dev!
    environment:
      POSTGRES_USER: splitwise_test
      POSTGRES_PASSWORD: splitwise_test
      POSTGRES_DB: splitwise_test
    tmpfs:
      - /var/lib/postgresql/data   # RAM = speed
```

### 5.2 Test Data Management

- **Factories** (factory pattern) for generating test data
- **Seeders** for repeatable scenarios
- **Cleanup** after each test (transaction + rollback or truncate)

```typescript
// test/helpers/test-fixtures.ts
export const createTestUser = (overrides?: Partial<User>) => ({
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
});

export const createTestExpense = (overrides?: Partial<Expense>) => ({
  description: 'Lunch',
  amount: 10000, // cents
  currency: 'PLN',
  ...overrides,
});
```

## 6. npm Scripts

### Backend (`apps/api/package.json`)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:unit": "jest --testPathPattern=\\.spec\\.ts$",
    "test:integration": "jest --config ./test/jest-integration.json",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:ci": "jest --coverage --ci --reporters=default --reporters=jest-junit"
  }
}
```

### Frontend (`apps/web/package.json`)

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:cov": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:ci": "vitest --coverage --reporter=junit"
  }
}
```

### Root (`package.json`)

```json
{
  "scripts": {
    "test": "pnpm -r test",
    "test:cov": "pnpm -r test:cov",
    "test:e2e": "pnpm -r test:e2e",
    "test:ci": "pnpm -r test:ci"
  }
}
```

## 7. CI/CD (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test:ci

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: splitwise_test
          POSTGRES_PASSWORD: splitwise_test
          POSTGRES_DB: splitwise_test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api test:integration
      - run: pnpm --filter api test:e2e

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm --filter web test:e2e
```

## 8. Code Coverage Goals

| Layer                  | Target | Minimum |
| ---------------------- | ------ | ------- |
| Backend — services     | 90%    | 80%     |
| Backend — controllers  | 80%    | 70%     |
| Backend — guards/pipes | 90%    | 85%     |
| Frontend — components  | 80%    | 70%     |
| Frontend — hooks       | 90%    | 80%     |
| Frontend — utils       | 95%    | 90%     |

## 9. Naming Conventions

| Test Type              | File Pattern               | Location                    |
| ---------------------- | -------------------------- | --------------------------- |
| Unit (backend)         | `*.spec.ts`                | Next to source file         |
| Integration (backend)  | `*.integration-spec.ts`    | Next to source or `test/`   |
| E2E (backend)          | `*.e2e-spec.ts`            | `apps/api/test/`            |
| Unit (frontend)        | `*.test.tsx` / `*.test.ts` | Next to source file         |
| E2E (frontend)         | `*.spec.ts`                | `apps/web/e2e/`             |
