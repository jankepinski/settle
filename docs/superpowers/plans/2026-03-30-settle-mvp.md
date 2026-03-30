# Settle MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simplified Splitwise clone with registration, login, groups, equal-split expenses, settlements, and balance tracking.

**Architecture:** Feature-sliced Clean Architecture with CQRS. Domain entities and repository interfaces in feature domain folders, command/query handler classes in application folders, Drizzle ORM implementations behind repository interfaces. Manual DI via composition root. Route Handlers as sole API entry points.

**Tech Stack:** Next.js (App Router), NextAuth.js, Drizzle ORM, PostgreSQL 16 (Docker), Vitest, Zod, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-30-settle-mvp-design.md`

---

## File Map

```
settle/
  docker-compose.yml
  .env.local
  .env.test
  package.json
  tsconfig.json
  next.config.ts
  drizzle.config.ts
  vitest.workspace.ts
  vitest.unit.config.ts
  vitest.integration.config.ts
  middleware.ts
  src/
    app/
      layout.tsx
      page.tsx
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
        groups/[id]/settlements/route.ts
        expenses/[id]/route.ts
        settlements/[id]/route.ts
    features/
      auth/
        domain/
          user.ts                            (User entity)
          user-repository.interface.ts       (IUserRepository)
        application/
          register-command.ts                (command + handler)
          get-all-users-query.ts             (query + handler)
          __tests__/
            register-command.unit.test.ts
            get-all-users-query.unit.test.ts
        infrastructure/
          drizzle-user-repository.ts
          __tests__/
            drizzle-user-repository.integration.test.ts
      groups/
        domain/
          group.ts                           (Group, GroupMember entities)
          group-repository.interface.ts      (IGroupRepository)
        application/
          create-group-command.ts
          add-group-member-command.ts
          remove-group-member-command.ts
          get-user-groups-query.ts
          get-group-details-query.ts
          __tests__/
            create-group-command.unit.test.ts
            add-group-member-command.unit.test.ts
            remove-group-member-command.unit.test.ts
            get-user-groups-query.unit.test.ts
            get-group-details-query.unit.test.ts
        infrastructure/
          drizzle-group-repository.ts
          __tests__/
            drizzle-group-repository.integration.test.ts
      expenses/
        domain/
          expense.ts                         (Expense, ExpenseSplit entities)
          expense-repository.interface.ts    (IExpenseRepository)
          expense-split-repository.interface.ts (IExpenseSplitRepository)
          split-calculator.ts                (equal split logic)
        application/
          create-expense-command.ts
          update-expense-command.ts
          delete-expense-command.ts
          create-settlement-command.ts
          delete-settlement-command.ts
          get-group-expenses-query.ts
          get-group-balances-query.ts
          __tests__/
            create-expense-command.unit.test.ts
            update-expense-command.unit.test.ts
            delete-expense-command.unit.test.ts
            create-settlement-command.unit.test.ts
            delete-settlement-command.unit.test.ts
            get-group-balances-query.unit.test.ts
        infrastructure/
          drizzle-expense-repository.ts
          drizzle-expense-split-repository.ts
          __tests__/
            drizzle-expense-repository.integration.test.ts
            drizzle-expense-split-repository.integration.test.ts
    shared/
      infrastructure/
        db/
          schema.ts                          (all Drizzle table definitions)
          client.ts                          (Drizzle client instance)
          migrate.ts                         (migration runner)
        di/
          container.ts                       (composition root)
        auth/
          auth-options.ts                    (NextAuth config)
      validation/
        auth-schemas.ts                      (Zod schemas for auth)
        group-schemas.ts                     (Zod schemas for groups)
        expense-schemas.ts                   (Zod schemas for expenses)
    components/
      ui/                                    (shadcn/ui components)
    lib/
      utils.ts                               (cn helper etc.)
      format.ts                              (cents → display formatting)
    test-utils/
      in-memory-user-repository.ts
      in-memory-group-repository.ts
      in-memory-expense-repository.ts
      in-memory-expense-split-repository.ts
      integration-setup.ts                   (DB setup/teardown helpers)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `docker-compose.yml`, `.env.local`, `.env.test`, `.gitignore`, `drizzle.config.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Expected: Project scaffolded with `src/app/` structure.

- [ ] **Step 2: Install backend dependencies**

```bash
npm install drizzle-orm postgres bcryptjs uuid zod next-auth@4
npm install -D drizzle-kit @types/bcryptjs @types/uuid
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 4: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: settle
      POSTGRES_PASSWORD: settle
      POSTGRES_DB: settle_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql

volumes:
  pgdata:
```

Create `init-test-db.sql`:

```sql
CREATE DATABASE settle_test;
```

- [ ] **Step 5: Create environment files**

Create `.env.local`:

```
DATABASE_URL=postgres://settle:settle@localhost:5432/settle_dev
NEXTAUTH_SECRET=dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

Create `.env.test`:

```
DATABASE_URL=postgres://settle:settle@localhost:5432/settle_test
```

- [ ] **Step 6: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 7: Update .gitignore**

Append to `.gitignore`:

```
.env.local
.env.test
```

- [ ] **Step 8: Add npm scripts to package.json**

Add to `scripts` in `package.json`:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
  "test": "npm run test:unit && npm run test:integration",
  "test:unit": "vitest run --config vitest.unit.config.ts",
  "test:integration": "vitest run --config vitest.integration.config.ts"
}
```

- [ ] **Step 9: Start Docker and verify**

```bash
docker compose up -d
docker compose exec db psql -U settle -d settle_dev -c "SELECT 1;"
docker compose exec db psql -U settle -d settle_test -c "SELECT 1;"
```

Expected: Both databases respond with `1`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Docker, Drizzle, deps"
```

---

## Task 2: Vitest Configuration

**Files:**
- Create: `vitest.workspace.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`

- [ ] **Step 1: Create vitest workspace config**

Create `vitest.workspace.ts`:

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./vitest.unit.config.ts",
  "./vitest.integration.config.ts",
]);
```

- [ ] **Step 2: Create unit test config**

Create `vitest.unit.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "unit",
    include: ["src/**/*.unit.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create integration test config**

Create `vitest.integration.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["./src/test-utils/integration-setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Create integration setup placeholder**

Create `src/test-utils/integration-setup.ts`:

```typescript
// Will be populated in Task 13 when DB client exists
export {};
```

- [ ] **Step 5: Verify configs load**

```bash
npx vitest run --config vitest.unit.config.ts
npx vitest run --config vitest.integration.config.ts
```

Expected: Both run with 0 tests found (no errors).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest with separate unit and integration suites"
```

---

## Task 3: Database Schema

**Files:**
- Create: `src/shared/infrastructure/db/schema.ts`, `src/shared/infrastructure/db/client.ts`

- [ ] **Step 1: Create Drizzle schema**

Create `src/shared/infrastructure/db/schema.ts`:

```typescript
import { pgTable, uuid, varchar, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id").notNull().references(() => groups.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
  }),
);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  paidBy: uuid("paid_by").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("expense"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenseSplits = pgTable("expense_splits", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
});
```

- [ ] **Step 2: Create DB client**

Create `src/shared/infrastructure/db/client.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
```

- [ ] **Step 3: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration files created in `drizzle/` folder and applied to `settle_dev`.

- [ ] **Step 4: Run migration on test DB**

```bash
DATABASE_URL=postgres://settle:settle@localhost:5432/settle_test npx drizzle-kit migrate
```

Expected: Schema applied to `settle_test`.

- [ ] **Step 5: Verify tables exist**

```bash
docker compose exec db psql -U settle -d settle_dev -c "\dt"
```

Expected: Tables `users`, `groups`, `group_members`, `expenses`, `expense_splits` listed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema and initial migration"
```

---

## Task 4: Domain Entities and Repository Interfaces

**Files:**
- Create: `src/features/auth/domain/user.ts`, `src/features/auth/domain/user-repository.interface.ts`
- Create: `src/features/groups/domain/group.ts`, `src/features/groups/domain/group-repository.interface.ts`
- Create: `src/features/expenses/domain/expense.ts`, `src/features/expenses/domain/expense-repository.interface.ts`, `src/features/expenses/domain/expense-split-repository.interface.ts`, `src/features/expenses/domain/split-calculator.ts`

- [ ] **Step 1: Create User entity and repository interface**

Create `src/features/auth/domain/user.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
}

export function toUserDTO(user: User): UserDTO {
  return { id: user.id, email: user.email, name: user.name };
}
```

Create `src/features/auth/domain/user-repository.interface.ts`:

```typescript
import { User } from "./user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
}
```

- [ ] **Step 2: Create Group entities and repository interface**

Create `src/features/groups/domain/group.ts`:

```typescript
export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  joinedAt: Date;
}
```

Create `src/features/groups/domain/group-repository.interface.ts`:

```typescript
import { Group, GroupMember } from "./group";

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  findByUserId(userId: string): Promise<Group[]>;
  findMembersByGroupId(groupId: string): Promise<GroupMember[]>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  save(group: Group): Promise<void>;
  addMember(member: GroupMember): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
}
```

- [ ] **Step 3: Create Expense entities and repository interfaces**

Create `src/features/expenses/domain/expense.ts`:

```typescript
export type ExpenseType = "expense" | "settlement";

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  description: string;
  type: ExpenseType;
  createdAt: Date;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
}
```

Create `src/features/expenses/domain/expense-repository.interface.ts`:

```typescript
import { Expense } from "./expense";

export interface IExpenseRepository {
  findById(id: string): Promise<Expense | null>;
  findByGroupId(groupId: string): Promise<Expense[]>;
  save(expense: Expense): Promise<void>;
  update(expense: Expense): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Create `src/features/expenses/domain/expense-split-repository.interface.ts`:

```typescript
import { ExpenseSplit } from "./expense";

export interface IExpenseSplitRepository {
  findByExpenseId(expenseId: string): Promise<ExpenseSplit[]>;
  findByGroupId(groupId: string): Promise<ExpenseSplit[]>;
  saveMany(splits: ExpenseSplit[]): Promise<void>;
  deleteByExpenseId(expenseId: string): Promise<void>;
}
```

- [ ] **Step 4: Create split calculator**

Create `src/features/expenses/domain/split-calculator.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";
import { ExpenseSplit } from "./expense";

export function calculateEqualSplits(
  expenseId: string,
  amount: number,
  participantIds: string[],
): ExpenseSplit[] {
  const sorted = [...participantIds].sort();
  const baseAmount = Math.floor(amount / sorted.length);
  const remainder = amount % sorted.length;

  return sorted.map((userId, index) => ({
    id: uuidv4(),
    expenseId,
    userId,
    amount: baseAmount + (index < remainder ? 1 : 0),
  }));
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add domain entities, repository interfaces, split calculator"
```

---

## Task 5: Split Calculator Unit Tests (TDD checkpoint)

**Files:**
- Create: `src/features/expenses/domain/__tests__/split-calculator.unit.test.ts`

- [ ] **Step 1: Write split calculator tests**

Create `src/features/expenses/domain/__tests__/split-calculator.unit.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateEqualSplits } from "../split-calculator";

describe("calculateEqualSplits", () => {
  it("splits evenly when divisible", () => {
    const splits = calculateEqualSplits("exp-1", 900, ["a", "b", "c"]);
    expect(splits).toHaveLength(3);
    expect(splits.every((s) => s.amount === 300)).toBe(true);
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(900);
  });

  it("distributes remainder to first N participants (sorted by userId)", () => {
    const splits = calculateEqualSplits("exp-1", 100, ["c", "a", "b"]);
    expect(splits).toHaveLength(3);
    const byUser = Object.fromEntries(splits.map((s) => [s.userId, s.amount]));
    expect(byUser["a"]).toBe(34);
    expect(byUser["b"]).toBe(33);
    expect(byUser["c"]).toBe(33);
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(100);
  });

  it("handles single participant", () => {
    const splits = calculateEqualSplits("exp-1", 500, ["a"]);
    expect(splits).toHaveLength(1);
    expect(splits[0].amount).toBe(500);
  });

  it("assigns correct expenseId to all splits", () => {
    const splits = calculateEqualSplits("exp-42", 200, ["a", "b"]);
    expect(splits.every((s) => s.expenseId === "exp-42")).toBe(true);
  });

  it("generates unique ids for each split", () => {
    const splits = calculateEqualSplits("exp-1", 300, ["a", "b", "c"]);
    const ids = splits.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run unit tests**

```bash
npm run test:unit
```

Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: add split calculator unit tests"
```

---

## Task 6: In-Memory Repository Mocks

**Files:**
- Create: `src/test-utils/in-memory-user-repository.ts`, `src/test-utils/in-memory-group-repository.ts`, `src/test-utils/in-memory-expense-repository.ts`, `src/test-utils/in-memory-expense-split-repository.ts`

- [ ] **Step 1: Create in-memory user repository**

Create `src/test-utils/in-memory-user-repository.ts`:

```typescript
import { User } from "@/features/auth/domain/user";
import { IUserRepository } from "@/features/auth/domain/user-repository.interface";

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users];
  }

  async save(user: User): Promise<void> {
    this.users.push(user);
  }
}
```

- [ ] **Step 2: Create in-memory group repository**

Create `src/test-utils/in-memory-group-repository.ts`:

```typescript
import { Group, GroupMember } from "@/features/groups/domain/group";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";

export class InMemoryGroupRepository implements IGroupRepository {
  private groups: Group[] = [];
  private members: GroupMember[] = [];

  async findById(id: string): Promise<Group | null> {
    return this.groups.find((g) => g.id === id) ?? null;
  }

  async findByUserId(userId: string): Promise<Group[]> {
    const groupIds = this.members
      .filter((m) => m.userId === userId)
      .map((m) => m.groupId);
    return this.groups.filter((g) => groupIds.includes(g.id));
  }

  async findMembersByGroupId(groupId: string): Promise<GroupMember[]> {
    return this.members.filter((m) => m.groupId === groupId);
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    return this.members.some((m) => m.groupId === groupId && m.userId === userId);
  }

  async save(group: Group): Promise<void> {
    this.groups.push(group);
  }

  async addMember(member: GroupMember): Promise<void> {
    const exists = this.members.some(
      (m) => m.groupId === member.groupId && m.userId === member.userId,
    );
    if (!exists) {
      this.members.push(member);
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    this.members = this.members.filter(
      (m) => !(m.groupId === groupId && m.userId === userId),
    );
  }
}
```

- [ ] **Step 3: Create in-memory expense repository**

Create `src/test-utils/in-memory-expense-repository.ts`:

```typescript
import { Expense } from "@/features/expenses/domain/expense";
import { IExpenseRepository } from "@/features/expenses/domain/expense-repository.interface";

export class InMemoryExpenseRepository implements IExpenseRepository {
  private expenses: Expense[] = [];

  async findById(id: string): Promise<Expense | null> {
    return this.expenses.find((e) => e.id === id) ?? null;
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    return this.expenses.filter((e) => e.groupId === groupId);
  }

  async save(expense: Expense): Promise<void> {
    this.expenses.push(expense);
  }

  async update(expense: Expense): Promise<void> {
    const index = this.expenses.findIndex((e) => e.id === expense.id);
    if (index !== -1) {
      this.expenses[index] = expense;
    }
  }

  async delete(id: string): Promise<void> {
    this.expenses = this.expenses.filter((e) => e.id !== id);
  }
}
```

- [ ] **Step 4: Create in-memory expense split repository**

Create `src/test-utils/in-memory-expense-split-repository.ts`:

```typescript
import { ExpenseSplit } from "@/features/expenses/domain/expense";
import { IExpenseSplitRepository } from "@/features/expenses/domain/expense-split-repository.interface";

export class InMemoryExpenseSplitRepository implements IExpenseSplitRepository {
  private splits: ExpenseSplit[] = [];

  async findByExpenseId(expenseId: string): Promise<ExpenseSplit[]> {
    return this.splits.filter((s) => s.expenseId === expenseId);
  }

  async findByGroupId(groupId: string): Promise<ExpenseSplit[]> {
    return [...this.splits];
  }

  async saveMany(splits: ExpenseSplit[]): Promise<void> {
    this.splits.push(...splits);
  }

  async deleteByExpenseId(expenseId: string): Promise<void> {
    this.splits = this.splits.filter((s) => s.expenseId !== expenseId);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add in-memory repository implementations for unit testing"
```

---

## Task 7: Zod Validation Schemas

**Files:**
- Create: `src/shared/validation/auth-schemas.ts`, `src/shared/validation/group-schemas.ts`, `src/shared/validation/expense-schemas.ts`

- [ ] **Step 1: Create auth schemas**

Create `src/shared/validation/auth-schemas.ts`:

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Create group schemas**

Create `src/shared/validation/group-schemas.ts`:

```typescript
import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  memberIds: z.array(z.string().uuid()).default([]),
});

export const addGroupMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
```

- [ ] **Step 3: Create expense schemas**

Create `src/shared/validation/expense-schemas.ts`:

```typescript
import { z } from "zod";

export const createExpenseSchema = z.object({
  paidById: z.string().uuid(),
  amount: z.number().int().positive(),
  description: z.string().min(1).max(500),
  participantIds: z.array(z.string().uuid()).min(1),
});

export const updateExpenseSchema = z.object({
  paidById: z.string().uuid(),
  amount: z.number().int().positive(),
  description: z.string().min(1).max(500),
  participantIds: z.array(z.string().uuid()).min(1),
});

export const createSettlementSchema = z.object({
  paidById: z.string().uuid(),
  recipientId: z.string().uuid(),
  amount: z.number().int().positive(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Zod validation schemas for auth, groups, expenses"
```

---

## Task 8: Auth Handlers + Unit Tests

**Files:**
- Create: `src/features/auth/application/register-command.ts`, `src/features/auth/application/get-all-users-query.ts`
- Create: `src/features/auth/application/__tests__/register-command.unit.test.ts`, `src/features/auth/application/__tests__/get-all-users-query.unit.test.ts`

- [ ] **Step 1: Write RegisterCommand handler tests**

Create `src/features/auth/application/__tests__/register-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { RegisterCommand, RegisterHandler } from "../register-command";
import { InMemoryUserRepository } from "@/test-utils/in-memory-user-repository";

describe("RegisterHandler", () => {
  let userRepo: InMemoryUserRepository;
  let handler: RegisterHandler;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    handler = new RegisterHandler(userRepo);
  });

  it("creates a user and returns userId", async () => {
    const command = new RegisterCommand("test@example.com", "Test User", "password123");
    const userId = await handler.execute(command);

    expect(userId).toBeDefined();
    const user = await userRepo.findByEmail("test@example.com");
    expect(user).not.toBeNull();
    expect(user!.name).toBe("Test User");
    expect(user!.email).toBe("test@example.com");
  });

  it("hashes the password", async () => {
    const command = new RegisterCommand("test@example.com", "Test User", "password123");
    await handler.execute(command);

    const user = await userRepo.findByEmail("test@example.com");
    expect(user!.passwordHash).not.toBe("password123");
    expect(user!.passwordHash.length).toBeGreaterThan(0);
  });

  it("rejects duplicate email", async () => {
    const command = new RegisterCommand("test@example.com", "Test User", "password123");
    await handler.execute(command);

    const duplicate = new RegisterCommand("test@example.com", "Another User", "password456");
    await expect(handler.execute(duplicate)).rejects.toThrow("Email already registered");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — `register-command` module does not exist.

- [ ] **Step 3: Implement RegisterCommand handler**

Create `src/features/auth/application/register-command.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";
import bcryptjs from "bcryptjs";
import { IUserRepository } from "../domain/user-repository.interface";
import { User } from "../domain/user";

export class RegisterCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
  ) {}
}

export class RegisterHandler {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(command: RegisterCommand): Promise<string> {
    const existing = await this.userRepo.findByEmail(command.email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const user: User = {
      id: uuidv4(),
      email: command.email,
      name: command.name,
      passwordHash: await bcryptjs.hash(command.password, 10),
      createdAt: new Date(),
    };

    await this.userRepo.save(user);
    return user.id;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit
```

Expected: All register tests PASS.

- [ ] **Step 5: Write GetAllUsersQuery tests**

Create `src/features/auth/application/__tests__/get-all-users-query.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { GetAllUsersQuery, GetAllUsersHandler } from "../get-all-users-query";
import { InMemoryUserRepository } from "@/test-utils/in-memory-user-repository";
import { User } from "../../domain/user";

describe("GetAllUsersHandler", () => {
  let userRepo: InMemoryUserRepository;
  let handler: GetAllUsersHandler;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    handler = new GetAllUsersHandler(userRepo);
  });

  it("returns empty array when no users exist", async () => {
    const result = await handler.execute(new GetAllUsersQuery());
    expect(result).toEqual([]);
  });

  it("returns users as DTOs without passwordHash", async () => {
    const user: User = {
      id: "u1",
      email: "a@test.com",
      name: "Alice",
      passwordHash: "secret-hash",
      createdAt: new Date(),
    };
    await userRepo.save(user);

    const result = await handler.execute(new GetAllUsersQuery());
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "u1", email: "a@test.com", name: "Alice" });
    expect((result[0] as any).passwordHash).toBeUndefined();
  });
});
```

- [ ] **Step 6: Implement GetAllUsersQuery handler**

Create `src/features/auth/application/get-all-users-query.ts`:

```typescript
import { IUserRepository } from "../domain/user-repository.interface";
import { UserDTO, toUserDTO } from "../domain/user";

export class GetAllUsersQuery {}

export class GetAllUsersHandler {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(_query: GetAllUsersQuery): Promise<UserDTO[]> {
    const users = await this.userRepo.findAll();
    return users.map(toUserDTO);
  }
}
```

- [ ] **Step 7: Run all unit tests**

```bash
npm run test:unit
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add auth handlers (Register, GetAllUsers) with unit tests"
```

---

## Task 9: Groups Handlers + Unit Tests

**Files:**
- Create: `src/features/groups/application/create-group-command.ts`, `add-group-member-command.ts`, `remove-group-member-command.ts`, `get-user-groups-query.ts`, `get-group-details-query.ts`
- Create: corresponding `__tests__/*.unit.test.ts` files

- [ ] **Step 1: Write CreateGroupCommand tests**

Create `src/features/groups/application/__tests__/create-group-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { CreateGroupCommand, CreateGroupHandler } from "../create-group-command";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("CreateGroupHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: CreateGroupHandler;

  beforeEach(() => {
    groupRepo = new InMemoryGroupRepository();
    handler = new CreateGroupHandler(groupRepo);
  });

  it("creates a group with creator as member", async () => {
    const command = new CreateGroupCommand("Trip", "creator-1", []);
    const groupId = await handler.execute(command);

    const group = await groupRepo.findById(groupId);
    expect(group).not.toBeNull();
    expect(group!.name).toBe("Trip");
    expect(group!.createdBy).toBe("creator-1");

    const members = await groupRepo.findMembersByGroupId(groupId);
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe("creator-1");
  });

  it("adds additional members", async () => {
    const command = new CreateGroupCommand("Trip", "creator-1", ["user-2", "user-3"]);
    const groupId = await handler.execute(command);

    const members = await groupRepo.findMembersByGroupId(groupId);
    expect(members).toHaveLength(3);
    const userIds = members.map((m) => m.userId).sort();
    expect(userIds).toEqual(["creator-1", "user-2", "user-3"]);
  });

  it("deduplicates creator in memberIds", async () => {
    const command = new CreateGroupCommand("Trip", "creator-1", ["creator-1", "user-2"]);
    const groupId = await handler.execute(command);

    const members = await groupRepo.findMembersByGroupId(groupId);
    expect(members).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Implement CreateGroupCommand**

Create `src/features/groups/application/create-group-command.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";
import { IGroupRepository } from "../domain/group-repository.interface";
import { Group, GroupMember } from "../domain/group";

export class CreateGroupCommand {
  constructor(
    public readonly name: string,
    public readonly creatorId: string,
    public readonly memberIds: string[],
  ) {}
}

export class CreateGroupHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(command: CreateGroupCommand): Promise<string> {
    const group: Group = {
      id: uuidv4(),
      name: command.name,
      createdBy: command.creatorId,
      createdAt: new Date(),
    };

    await this.groupRepo.save(group);

    const uniqueMembers = new Set([command.creatorId, ...command.memberIds]);
    for (const userId of uniqueMembers) {
      const member: GroupMember = {
        groupId: group.id,
        userId,
        joinedAt: new Date(),
      };
      await this.groupRepo.addMember(member);
    }

    return group.id;
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npm run test:unit
```

Expected: CreateGroupCommand tests PASS.

- [ ] **Step 4: Write and implement AddGroupMemberCommand**

Create `src/features/groups/application/__tests__/add-group-member-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { AddGroupMemberCommand, AddGroupMemberHandler } from "../add-group-member-command";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";
import { Group } from "../../domain/group";

describe("AddGroupMemberHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: AddGroupMemberHandler;

  beforeEach(async () => {
    groupRepo = new InMemoryGroupRepository();
    handler = new AddGroupMemberHandler(groupRepo);
    const group: Group = { id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
  });

  it("adds a new member to the group", async () => {
    await handler.execute(new AddGroupMemberCommand("g1", "u2"));
    const members = await groupRepo.findMembersByGroupId("g1");
    expect(members).toHaveLength(2);
  });

  it("is idempotent for existing members", async () => {
    await handler.execute(new AddGroupMemberCommand("g1", "u1"));
    const members = await groupRepo.findMembersByGroupId("g1");
    expect(members).toHaveLength(1);
  });

  it("rejects when group does not exist", async () => {
    await expect(
      handler.execute(new AddGroupMemberCommand("nonexistent", "u2")),
    ).rejects.toThrow("Group not found");
  });
});
```

Create `src/features/groups/application/add-group-member-command.ts`:

```typescript
import { IGroupRepository } from "../domain/group-repository.interface";
import { GroupMember } from "../domain/group";

export class AddGroupMemberCommand {
  constructor(
    public readonly groupId: string,
    public readonly userId: string,
  ) {}
}

export class AddGroupMemberHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(command: AddGroupMemberCommand): Promise<void> {
    const group = await this.groupRepo.findById(command.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const member: GroupMember = {
      groupId: command.groupId,
      userId: command.userId,
      joinedAt: new Date(),
    };
    await this.groupRepo.addMember(member);
  }
}
```

- [ ] **Step 5: Write and implement RemoveGroupMemberCommand**

Create `src/features/groups/application/__tests__/remove-group-member-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { RemoveGroupMemberCommand, RemoveGroupMemberHandler } from "../remove-group-member-command";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";

describe("RemoveGroupMemberHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let handler: RemoveGroupMemberHandler;

  beforeEach(async () => {
    groupRepo = new InMemoryGroupRepository();
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    handler = new RemoveGroupMemberHandler(groupRepo, expenseRepo, splitRepo);

    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
  });

  it("removes a member with no expenses", async () => {
    await handler.execute(new RemoveGroupMemberCommand("g1", "u2"));
    const members = await groupRepo.findMembersByGroupId("g1");
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe("u1");
  });

  it("rejects when member is paidBy on an expense", async () => {
    await expenseRepo.save({
      id: "e1", groupId: "g1", paidBy: "u2", amount: 100,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });

    await expect(
      handler.execute(new RemoveGroupMemberCommand("g1", "u2")),
    ).rejects.toThrow("Cannot remove member");
  });

  it("rejects when member has expense splits", async () => {
    await expenseRepo.save({
      id: "e1", groupId: "g1", paidBy: "u1", amount: 100,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([{ id: "s1", expenseId: "e1", userId: "u2", amount: 50 }]);

    await expect(
      handler.execute(new RemoveGroupMemberCommand("g1", "u2")),
    ).rejects.toThrow("Cannot remove member");
  });
});
```

Create `src/features/groups/application/remove-group-member-command.ts`:

```typescript
import { IGroupRepository } from "../domain/group-repository.interface";
import { IExpenseRepository } from "@/features/expenses/domain/expense-repository.interface";
import { IExpenseSplitRepository } from "@/features/expenses/domain/expense-split-repository.interface";

export class RemoveGroupMemberCommand {
  constructor(
    public readonly groupId: string,
    public readonly userId: string,
  ) {}
}

export class RemoveGroupMemberHandler {
  constructor(
    private readonly groupRepo: IGroupRepository,
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(command: RemoveGroupMemberCommand): Promise<void> {
    const expenses = await this.expenseRepo.findByGroupId(command.groupId);
    const isPayer = expenses.some((e) => e.paidBy === command.userId);
    if (isPayer) {
      throw new Error("Cannot remove member: they are the payer on existing expenses");
    }

    const splits = await this.splitRepo.findByGroupId(command.groupId);
    const hasSplits = splits.some((s) => s.userId === command.userId);
    if (hasSplits) {
      throw new Error("Cannot remove member: they appear in expense splits");
    }

    await this.groupRepo.removeMember(command.groupId, command.userId);
  }
}
```

- [ ] **Step 6: Write and implement query handlers**

Create `src/features/groups/application/get-user-groups-query.ts`:

```typescript
import { IGroupRepository } from "../domain/group-repository.interface";
import { Group } from "../domain/group";

export class GetUserGroupsQuery {
  constructor(public readonly userId: string) {}
}

export class GetUserGroupsHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(query: GetUserGroupsQuery): Promise<Group[]> {
    return this.groupRepo.findByUserId(query.userId);
  }
}
```

Create `src/features/groups/application/get-group-details-query.ts`:

```typescript
import { IGroupRepository } from "../domain/group-repository.interface";
import { Group, GroupMember } from "../domain/group";

export class GetGroupDetailsQuery {
  constructor(public readonly groupId: string) {}
}

export interface GroupDetails {
  group: Group;
  members: GroupMember[];
}

export class GetGroupDetailsHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(query: GetGroupDetailsQuery): Promise<GroupDetails> {
    const group = await this.groupRepo.findById(query.groupId);
    if (!group) {
      throw new Error("Group not found");
    }
    const members = await this.groupRepo.findMembersByGroupId(query.groupId);
    return { group, members };
  }
}
```

- [ ] **Step 7: Write query handler tests**

Create `src/features/groups/application/__tests__/get-user-groups-query.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { GetUserGroupsQuery, GetUserGroupsHandler } from "../get-user-groups-query";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("GetUserGroupsHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: GetUserGroupsHandler;

  beforeEach(() => {
    groupRepo = new InMemoryGroupRepository();
    handler = new GetUserGroupsHandler(groupRepo);
  });

  it("returns empty array when user has no groups", async () => {
    const result = await handler.execute(new GetUserGroupsQuery("u1"));
    expect(result).toEqual([]);
  });

  it("returns only groups the user is a member of", async () => {
    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.save({ id: "g2", name: "Office", createdBy: "u2", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g2", userId: "u2", joinedAt: new Date() });

    const result = await handler.execute(new GetUserGroupsQuery("u1"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});
```

Create `src/features/groups/application/__tests__/get-group-details-query.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { GetGroupDetailsQuery, GetGroupDetailsHandler } from "../get-group-details-query";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("GetGroupDetailsHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: GetGroupDetailsHandler;

  beforeEach(async () => {
    groupRepo = new InMemoryGroupRepository();
    handler = new GetGroupDetailsHandler(groupRepo);
    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
  });

  it("returns group with members", async () => {
    const result = await handler.execute(new GetGroupDetailsQuery("g1"));
    expect(result.group.name).toBe("Trip");
    expect(result.members).toHaveLength(2);
  });

  it("throws when group not found", async () => {
    await expect(handler.execute(new GetGroupDetailsQuery("nonexistent"))).rejects.toThrow(
      "Group not found",
    );
  });
});
```

- [ ] **Step 8: Run all unit tests**

```bash
npm run test:unit
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add groups handlers (Create, AddMember, RemoveMember, queries) with unit tests"
```

---

## Task 10: Expense Handlers + Unit Tests

**Files:**
- Create: `src/features/expenses/application/create-expense-command.ts`, `update-expense-command.ts`, `delete-expense-command.ts`
- Create: corresponding `__tests__/*.unit.test.ts` files

- [ ] **Step 1: Write CreateExpenseCommand tests**

Create `src/features/expenses/application/__tests__/create-expense-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { CreateExpenseCommand, CreateExpenseHandler } from "../create-expense-command";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("CreateExpenseHandler", () => {
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let groupRepo: InMemoryGroupRepository;
  let handler: CreateExpenseHandler;

  beforeEach(async () => {
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    groupRepo = new InMemoryGroupRepository();
    handler = new CreateExpenseHandler(expenseRepo, splitRepo, groupRepo);

    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u3", joinedAt: new Date() });
  });

  it("creates an expense with equal splits", async () => {
    const command = new CreateExpenseCommand("g1", "u1", 900, "Dinner", ["u1", "u2", "u3"]);
    const expenseId = await handler.execute(command);

    const expense = await expenseRepo.findById(expenseId);
    expect(expense).not.toBeNull();
    expect(expense!.amount).toBe(900);
    expect(expense!.type).toBe("expense");

    const splits = await splitRepo.findByExpenseId(expenseId);
    expect(splits).toHaveLength(3);
    expect(splits.every((s) => s.amount === 300)).toBe(true);
  });

  it("rejects when paidById is not a group member", async () => {
    const command = new CreateExpenseCommand("g1", "outsider", 100, "Test", ["u1"]);
    await expect(handler.execute(command)).rejects.toThrow("not a group member");
  });

  it("rejects when a participant is not a group member", async () => {
    const command = new CreateExpenseCommand("g1", "u1", 100, "Test", ["u1", "outsider"]);
    await expect(handler.execute(command)).rejects.toThrow("not a group member");
  });

  it("allows payer to not be a participant", async () => {
    const command = new CreateExpenseCommand("g1", "u1", 100, "Gift", ["u2", "u3"]);
    const expenseId = await handler.execute(command);

    const splits = await splitRepo.findByExpenseId(expenseId);
    expect(splits).toHaveLength(2);
    expect(splits.every((s) => s.userId !== "u1")).toBe(true);
  });
});
```

- [ ] **Step 2: Implement CreateExpenseCommand**

Create `src/features/expenses/application/create-expense-command.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";
import { Expense } from "../domain/expense";
import { calculateEqualSplits } from "../domain/split-calculator";

export class CreateExpenseCommand {
  constructor(
    public readonly groupId: string,
    public readonly paidById: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly participantIds: string[],
  ) {}
}

export class CreateExpenseHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: CreateExpenseCommand): Promise<string> {
    const isPayer = await this.groupRepo.isMember(command.groupId, command.paidById);
    if (!isPayer) {
      throw new Error(`User ${command.paidById} is not a group member`);
    }

    for (const pid of command.participantIds) {
      const isMember = await this.groupRepo.isMember(command.groupId, pid);
      if (!isMember) {
        throw new Error(`User ${pid} is not a group member`);
      }
    }

    const expense: Expense = {
      id: uuidv4(),
      groupId: command.groupId,
      paidBy: command.paidById,
      amount: command.amount,
      description: command.description,
      type: "expense",
      createdAt: new Date(),
    };

    await this.expenseRepo.save(expense);

    const splits = calculateEqualSplits(expense.id, command.amount, command.participantIds);
    await this.splitRepo.saveMany(splits);

    return expense.id;
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npm run test:unit
```

Expected: CreateExpenseCommand tests PASS.

- [ ] **Step 4: Write and implement UpdateExpenseCommand**

Create `src/features/expenses/application/__tests__/update-expense-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { UpdateExpenseCommand, UpdateExpenseHandler } from "../update-expense-command";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";
import { Expense } from "../../domain/expense";

describe("UpdateExpenseHandler", () => {
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let groupRepo: InMemoryGroupRepository;
  let handler: UpdateExpenseHandler;

  beforeEach(async () => {
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    groupRepo = new InMemoryGroupRepository();
    handler = new UpdateExpenseHandler(expenseRepo, splitRepo, groupRepo);

    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u3", joinedAt: new Date() });

    const expense: Expense = {
      id: "e1", groupId: "g1", paidBy: "u1", amount: 900,
      description: "Dinner", type: "expense", createdAt: new Date(),
    };
    await expenseRepo.save(expense);
    await splitRepo.saveMany([
      { id: "s1", expenseId: "e1", userId: "u1", amount: 300 },
      { id: "s2", expenseId: "e1", userId: "u2", amount: 300 },
      { id: "s3", expenseId: "e1", userId: "u3", amount: 300 },
    ]);
  });

  it("updates expense and recalculates splits", async () => {
    const command = new UpdateExpenseCommand("e1", 600, "Updated Dinner", "u1", ["u1", "u2"]);
    await handler.execute(command);

    const expense = await expenseRepo.findById("e1");
    expect(expense!.amount).toBe(600);
    expect(expense!.description).toBe("Updated Dinner");

    const splits = await splitRepo.findByExpenseId("e1");
    expect(splits).toHaveLength(2);
    expect(splits.every((s) => s.amount === 300)).toBe(true);
  });

  it("rejects updating a settlement", async () => {
    await expenseRepo.save({
      id: "e2", groupId: "g1", paidBy: "u1", amount: 100,
      description: "", type: "settlement", createdAt: new Date(),
    });

    const command = new UpdateExpenseCommand("e2", 200, "Updated", "u1", ["u2"]);
    await expect(handler.execute(command)).rejects.toThrow("Cannot update a settlement");
  });
});
```

Create `src/features/expenses/application/update-expense-command.ts`:

```typescript
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";
import { calculateEqualSplits } from "../domain/split-calculator";

export class UpdateExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly paidById: string,
    public readonly participantIds: string[],
  ) {}
}

export class UpdateExpenseHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: UpdateExpenseCommand): Promise<void> {
    const expense = await this.expenseRepo.findById(command.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    if (expense.type === "settlement") {
      throw new Error("Cannot update a settlement");
    }

    const isPayer = await this.groupRepo.isMember(expense.groupId, command.paidById);
    if (!isPayer) {
      throw new Error(`User ${command.paidById} is not a group member`);
    }

    for (const pid of command.participantIds) {
      const isMember = await this.groupRepo.isMember(expense.groupId, pid);
      if (!isMember) {
        throw new Error(`User ${pid} is not a group member`);
      }
    }

    const updated = {
      ...expense,
      amount: command.amount,
      description: command.description,
      paidBy: command.paidById,
    };
    await this.expenseRepo.update(updated);

    await this.splitRepo.deleteByExpenseId(command.expenseId);
    const splits = calculateEqualSplits(command.expenseId, command.amount, command.participantIds);
    await this.splitRepo.saveMany(splits);
  }
}
```

- [ ] **Step 5: Write and implement DeleteExpenseCommand**

Create `src/features/expenses/application/__tests__/delete-expense-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { DeleteExpenseCommand, DeleteExpenseHandler } from "../delete-expense-command";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";

describe("DeleteExpenseHandler", () => {
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let handler: DeleteExpenseHandler;

  beforeEach(async () => {
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    handler = new DeleteExpenseHandler(expenseRepo, splitRepo);

    await expenseRepo.save({
      id: "e1", groupId: "g1", paidBy: "u1", amount: 900,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "s1", expenseId: "e1", userId: "u1", amount: 300 },
    ]);
  });

  it("deletes expense and its splits", async () => {
    await handler.execute(new DeleteExpenseCommand("e1"));
    expect(await expenseRepo.findById("e1")).toBeNull();
    expect(await splitRepo.findByExpenseId("e1")).toHaveLength(0);
  });

  it("rejects deleting a settlement via expense delete", async () => {
    await expenseRepo.save({
      id: "e2", groupId: "g1", paidBy: "u1", amount: 100,
      description: "", type: "settlement", createdAt: new Date(),
    });

    await expect(handler.execute(new DeleteExpenseCommand("e2"))).rejects.toThrow(
      "Use DeleteSettlementCommand",
    );
  });
});
```

Create `src/features/expenses/application/delete-expense-command.ts`:

```typescript
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";

export class DeleteExpenseCommand {
  constructor(public readonly expenseId: string) {}
}

export class DeleteExpenseHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(command: DeleteExpenseCommand): Promise<void> {
    const expense = await this.expenseRepo.findById(command.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    if (expense.type === "settlement") {
      throw new Error("Use DeleteSettlementCommand for settlements");
    }

    await this.splitRepo.deleteByExpenseId(command.expenseId);
    await this.expenseRepo.delete(command.expenseId);
  }
}
```

- [ ] **Step 6: Run all unit tests**

```bash
npm run test:unit
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add expense handlers (Create, Update, Delete) with unit tests"
```

---

## Task 11: Settlement + Balance Handlers + Unit Tests

**Files:**
- Create: `src/features/expenses/application/create-settlement-command.ts`, `delete-settlement-command.ts`, `get-group-expenses-query.ts`, `get-group-balances-query.ts`
- Create: corresponding `__tests__/*.unit.test.ts` files

- [ ] **Step 1: Write and implement CreateSettlementCommand**

Create `src/features/expenses/application/__tests__/create-settlement-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { CreateSettlementCommand, CreateSettlementHandler } from "../create-settlement-command";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("CreateSettlementHandler", () => {
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let groupRepo: InMemoryGroupRepository;
  let handler: CreateSettlementHandler;

  beforeEach(async () => {
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    groupRepo = new InMemoryGroupRepository();
    handler = new CreateSettlementHandler(expenseRepo, splitRepo, groupRepo);

    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
  });

  it("creates a settlement with single split", async () => {
    const command = new CreateSettlementCommand("g1", "u1", "u2", 500);
    const id = await handler.execute(command);

    const expense = await expenseRepo.findById(id);
    expect(expense!.type).toBe("settlement");
    expect(expense!.paidBy).toBe("u1");

    const splits = await splitRepo.findByExpenseId(id);
    expect(splits).toHaveLength(1);
    expect(splits[0].userId).toBe("u2");
    expect(splits[0].amount).toBe(500);
  });

  it("rejects when paidBy equals recipient", async () => {
    const command = new CreateSettlementCommand("g1", "u1", "u1", 500);
    await expect(handler.execute(command)).rejects.toThrow("Payer and recipient must differ");
  });

  it("rejects when payer is not a group member", async () => {
    const command = new CreateSettlementCommand("g1", "outsider", "u2", 500);
    await expect(handler.execute(command)).rejects.toThrow("not a group member");
  });
});
```

Create `src/features/expenses/application/create-settlement-command.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";
import { Expense, ExpenseSplit } from "../domain/expense";

export class CreateSettlementCommand {
  constructor(
    public readonly groupId: string,
    public readonly paidById: string,
    public readonly recipientId: string,
    public readonly amount: number,
  ) {}
}

export class CreateSettlementHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: CreateSettlementCommand): Promise<string> {
    if (command.paidById === command.recipientId) {
      throw new Error("Payer and recipient must differ");
    }

    const isPayer = await this.groupRepo.isMember(command.groupId, command.paidById);
    if (!isPayer) {
      throw new Error(`User ${command.paidById} is not a group member`);
    }

    const isRecipient = await this.groupRepo.isMember(command.groupId, command.recipientId);
    if (!isRecipient) {
      throw new Error(`User ${command.recipientId} is not a group member`);
    }

    const expense: Expense = {
      id: uuidv4(),
      groupId: command.groupId,
      paidBy: command.paidById,
      amount: command.amount,
      description: "",
      type: "settlement",
      createdAt: new Date(),
    };

    await this.expenseRepo.save(expense);

    const split: ExpenseSplit = {
      id: uuidv4(),
      expenseId: expense.id,
      userId: command.recipientId,
      amount: command.amount,
    };
    await this.splitRepo.saveMany([split]);

    return expense.id;
  }
}
```

- [ ] **Step 2: Write and implement DeleteSettlementCommand**

Create `src/features/expenses/application/__tests__/delete-settlement-command.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { DeleteSettlementCommand, DeleteSettlementHandler } from "../delete-settlement-command";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";

describe("DeleteSettlementHandler", () => {
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let handler: DeleteSettlementHandler;

  beforeEach(async () => {
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    handler = new DeleteSettlementHandler(expenseRepo, splitRepo);

    await expenseRepo.save({
      id: "e1", groupId: "g1", paidBy: "u1", amount: 500,
      description: "", type: "settlement", createdAt: new Date(),
    });
    await splitRepo.saveMany([{ id: "s1", expenseId: "e1", userId: "u2", amount: 500 }]);
  });

  it("deletes a settlement", async () => {
    await handler.execute(new DeleteSettlementCommand("e1"));
    expect(await expenseRepo.findById("e1")).toBeNull();
    expect(await splitRepo.findByExpenseId("e1")).toHaveLength(0);
  });

  it("rejects deleting a non-settlement", async () => {
    await expenseRepo.save({
      id: "e2", groupId: "g1", paidBy: "u1", amount: 100,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });

    await expect(handler.execute(new DeleteSettlementCommand("e2"))).rejects.toThrow(
      "Not a settlement",
    );
  });
});
```

Create `src/features/expenses/application/delete-settlement-command.ts`:

```typescript
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";

export class DeleteSettlementCommand {
  constructor(public readonly expenseId: string) {}
}

export class DeleteSettlementHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(command: DeleteSettlementCommand): Promise<void> {
    const expense = await this.expenseRepo.findById(command.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    if (expense.type !== "settlement") {
      throw new Error("Not a settlement");
    }

    await this.splitRepo.deleteByExpenseId(command.expenseId);
    await this.expenseRepo.delete(command.expenseId);
  }
}
```

- [ ] **Step 3: Write and implement GetGroupBalancesQuery**

Create `src/features/expenses/application/__tests__/get-group-balances-query.unit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { GetGroupBalancesQuery, GetGroupBalancesHandler } from "../get-group-balances-query";
import { InMemoryExpenseRepository } from "@/test-utils/in-memory-expense-repository";
import { InMemoryExpenseSplitRepository } from "@/test-utils/in-memory-expense-split-repository";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("GetGroupBalancesHandler", () => {
  let expenseRepo: InMemoryExpenseRepository;
  let splitRepo: InMemoryExpenseSplitRepository;
  let groupRepo: InMemoryGroupRepository;
  let handler: GetGroupBalancesHandler;

  beforeEach(async () => {
    expenseRepo = new InMemoryExpenseRepository();
    splitRepo = new InMemoryExpenseSplitRepository();
    groupRepo = new InMemoryGroupRepository();
    handler = new GetGroupBalancesHandler(expenseRepo, splitRepo, groupRepo);

    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u3", joinedAt: new Date() });
  });

  it("returns zero balances when no expenses", async () => {
    const result = await handler.execute(new GetGroupBalancesQuery("g1"));
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.balance === 0)).toBe(true);
  });

  it("calculates correct balances for a single expense", async () => {
    await expenseRepo.save({
      id: "e1", groupId: "g1", paidBy: "u1", amount: 900,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "s1", expenseId: "e1", userId: "u1", amount: 300 },
      { id: "s2", expenseId: "e1", userId: "u2", amount: 300 },
      { id: "s3", expenseId: "e1", userId: "u3", amount: 300 },
    ]);

    const result = await handler.execute(new GetGroupBalancesQuery("g1"));
    const byUser = Object.fromEntries(result.map((b) => [b.userId, b.balance]));

    expect(byUser["u1"]).toBe(600);   // paid 900 - owes 300
    expect(byUser["u2"]).toBe(-300);  // paid 0 - owes 300
    expect(byUser["u3"]).toBe(-300);  // paid 0 - owes 300
  });

  it("accounts for settlements", async () => {
    await expenseRepo.save({
      id: "e1", groupId: "g1", paidBy: "u1", amount: 600,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "s1", expenseId: "e1", userId: "u1", amount: 300 },
      { id: "s2", expenseId: "e1", userId: "u2", amount: 300 },
    ]);
    // u2 settles 300 with u1
    await expenseRepo.save({
      id: "e2", groupId: "g1", paidBy: "u2", amount: 300,
      description: "", type: "settlement", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "s3", expenseId: "e2", userId: "u1", amount: 300 },
    ]);

    const result = await handler.execute(new GetGroupBalancesQuery("g1"));
    const byUser = Object.fromEntries(result.map((b) => [b.userId, b.balance]));

    expect(byUser["u1"]).toBe(0);   // paid 600 - owes 300 - receives 300 (split)
    expect(byUser["u2"]).toBe(0);   // paid 300 - owes 300
    expect(byUser["u3"]).toBe(0);
  });
});
```

Create `src/features/expenses/application/get-group-balances-query.ts`:

```typescript
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";

export class GetGroupBalancesQuery {
  constructor(public readonly groupId: string) {}
}

export interface MemberBalance {
  userId: string;
  balance: number;
}

export class GetGroupBalancesHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(query: GetGroupBalancesQuery): Promise<MemberBalance[]> {
    const members = await this.groupRepo.findMembersByGroupId(query.groupId);
    const expenses = await this.expenseRepo.findByGroupId(query.groupId);
    const splits = await this.splitRepo.findByGroupId(query.groupId);

    const balanceMap = new Map<string, number>();
    for (const member of members) {
      balanceMap.set(member.userId, 0);
    }

    for (const expense of expenses) {
      const current = balanceMap.get(expense.paidBy) ?? 0;
      balanceMap.set(expense.paidBy, current + expense.amount);
    }

    for (const split of splits) {
      const current = balanceMap.get(split.userId) ?? 0;
      balanceMap.set(split.userId, current - split.amount);
    }

    return Array.from(balanceMap.entries()).map(([userId, balance]) => ({
      userId,
      balance,
    }));
  }
}
```

- [ ] **Step 4: Create GetGroupExpensesQuery**

Create `src/features/expenses/application/get-group-expenses-query.ts`:

```typescript
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { Expense, ExpenseSplit } from "../domain/expense";

export class GetGroupExpensesQuery {
  constructor(public readonly groupId: string) {}
}

export interface ExpenseWithSplits {
  expense: Expense;
  splits: ExpenseSplit[];
}

export class GetGroupExpensesHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(query: GetGroupExpensesQuery): Promise<ExpenseWithSplits[]> {
    const expenses = await this.expenseRepo.findByGroupId(query.groupId);
    const result: ExpenseWithSplits[] = [];

    for (const expense of expenses) {
      const splits = await this.splitRepo.findByExpenseId(expense.id);
      result.push({ expense, splits });
    }

    return result;
  }
}
```

- [ ] **Step 5: Run all unit tests**

```bash
npm run test:unit
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add settlement, balance, and expense query handlers with unit tests"
```

---

## Task 12: Drizzle Repository Implementations

**Files:**
- Create: `src/features/auth/infrastructure/drizzle-user-repository.ts`
- Create: `src/features/groups/infrastructure/drizzle-group-repository.ts`
- Create: `src/features/expenses/infrastructure/drizzle-expense-repository.ts`
- Create: `src/features/expenses/infrastructure/drizzle-expense-split-repository.ts`

- [ ] **Step 1: Create DrizzleUserRepository**

Create `src/features/auth/infrastructure/drizzle-user-repository.ts`:

```typescript
import { eq } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { users } from "@/shared/infrastructure/db/schema";
import { User } from "../domain/user";
import { IUserRepository } from "../domain/user-repository.interface";

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async save(user: User): Promise<void> {
    await this.db.insert(users).values({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    });
  }
}
```

- [ ] **Step 2: Create DrizzleGroupRepository**

Create `src/features/groups/infrastructure/drizzle-group-repository.ts`:

```typescript
import { eq, and } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { groups, groupMembers } from "@/shared/infrastructure/db/schema";
import { Group, GroupMember } from "../domain/group";
import { IGroupRepository } from "../domain/group-repository.interface";

export class DrizzleGroupRepository implements IGroupRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Group | null> {
    const result = await this.db.select().from(groups).where(eq(groups.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string): Promise<Group[]> {
    const memberRows = await this.db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    if (memberRows.length === 0) return [];

    const groupIds = memberRows.map((r) => r.groupId);
    const result = await this.db.select().from(groups);
    return result.filter((g) => groupIds.includes(g.id));
  }

  async findMembersByGroupId(groupId: string): Promise<GroupMember[]> {
    return this.db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    return result.length > 0;
  }

  async save(group: Group): Promise<void> {
    await this.db.insert(groups).values({
      id: group.id,
      name: group.name,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
    });
  }

  async addMember(member: GroupMember): Promise<void> {
    await this.db
      .insert(groupMembers)
      .values({
        groupId: member.groupId,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })
      .onConflictDoNothing();
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }
}
```

- [ ] **Step 3: Create DrizzleExpenseRepository and DrizzleExpenseSplitRepository**

Create `src/features/expenses/infrastructure/drizzle-expense-repository.ts`:

```typescript
import { eq } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { expenses } from "@/shared/infrastructure/db/schema";
import { Expense } from "../domain/expense";
import { IExpenseRepository } from "../domain/expense-repository.interface";

export class DrizzleExpenseRepository implements IExpenseRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Expense | null> {
    const result = await this.db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    return this.db.select().from(expenses).where(eq(expenses.groupId, groupId));
  }

  async save(expense: Expense): Promise<void> {
    await this.db.insert(expenses).values({
      id: expense.id,
      groupId: expense.groupId,
      paidBy: expense.paidBy,
      amount: expense.amount,
      description: expense.description,
      type: expense.type,
      createdAt: expense.createdAt,
    });
  }

  async update(expense: Expense): Promise<void> {
    await this.db
      .update(expenses)
      .set({
        paidBy: expense.paidBy,
        amount: expense.amount,
        description: expense.description,
      })
      .where(eq(expenses.id, expense.id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(expenses).where(eq(expenses.id, id));
  }
}
```

Create `src/features/expenses/infrastructure/drizzle-expense-split-repository.ts`:

```typescript
import { eq } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { expenses, expenseSplits } from "@/shared/infrastructure/db/schema";
import { ExpenseSplit } from "../domain/expense";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { inArray } from "drizzle-orm";

export class DrizzleExpenseSplitRepository implements IExpenseSplitRepository {
  constructor(private readonly db: Database) {}

  async findByExpenseId(expenseId: string): Promise<ExpenseSplit[]> {
    return this.db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.expenseId, expenseId));
  }

  async findByGroupId(groupId: string): Promise<ExpenseSplit[]> {
    const groupExpenses = await this.db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.groupId, groupId));

    if (groupExpenses.length === 0) return [];

    const expenseIds = groupExpenses.map((e) => e.id);
    return this.db
      .select()
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseIds));
  }

  async saveMany(splits: ExpenseSplit[]): Promise<void> {
    if (splits.length === 0) return;
    await this.db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: s.id,
        expenseId: s.expenseId,
        userId: s.userId,
        amount: s.amount,
      })),
    );
  }

  async deleteByExpenseId(expenseId: string): Promise<void> {
    await this.db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle repository implementations for all features"
```

---

## Task 13: Integration Tests + Test DB Setup

**Files:**
- Modify: `src/test-utils/integration-setup.ts`
- Create: `src/features/auth/infrastructure/__tests__/drizzle-user-repository.integration.test.ts`
- Create: `src/features/groups/infrastructure/__tests__/drizzle-group-repository.integration.test.ts`
- Create: `src/features/expenses/infrastructure/__tests__/drizzle-expense-repository.integration.test.ts`

- [ ] **Step 1: Implement integration test setup**

Update `src/test-utils/integration-setup.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@/shared/infrastructure/db/schema";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://settle:settle@localhost:5432/settle_test";

const queryClient = postgres(TEST_DATABASE_URL);
export const testDb = drizzle(queryClient, { schema });

export async function truncateAllTables() {
  await testDb.execute(sql`TRUNCATE TABLE expense_splits, expenses, group_members, groups, users CASCADE`);
}

export async function closeConnection() {
  await queryClient.end();
}
```

- [ ] **Step 2: Update integration vitest config to load .env.test**

Update `vitest.integration.config.ts` — add `envFile`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["./src/test-utils/integration-setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    env: {
      DATABASE_URL: "postgres://settle:settle@localhost:5432/settle_test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Write user repository integration test**

Create `src/features/auth/infrastructure/__tests__/drizzle-user-repository.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { DrizzleUserRepository } from "../drizzle-user-repository";
import { testDb, truncateAllTables, closeConnection } from "@/test-utils/integration-setup";
import { User } from "../../domain/user";

describe("DrizzleUserRepository", () => {
  const repo = new DrizzleUserRepository(testDb);

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("saves and finds a user by id", async () => {
    const user: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@example.com",
      name: "Test",
      passwordHash: "hash",
      createdAt: new Date(),
    };
    await repo.save(user);

    const found = await repo.findById(user.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe("test@example.com");
  });

  it("finds a user by email", async () => {
    const user: User = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      email: "find@example.com",
      name: "Find",
      passwordHash: "hash",
      createdAt: new Date(),
    };
    await repo.save(user);

    const found = await repo.findByEmail("find@example.com");
    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
  });

  it("returns null for non-existent user", async () => {
    const found = await repo.findById("550e8400-e29b-41d4-a716-446655440099");
    expect(found).toBeNull();
  });

  it("finds all users", async () => {
    await repo.save({
      id: "550e8400-e29b-41d4-a716-446655440002",
      email: "a@test.com", name: "A", passwordHash: "h", createdAt: new Date(),
    });
    await repo.save({
      id: "550e8400-e29b-41d4-a716-446655440003",
      email: "b@test.com", name: "B", passwordHash: "h", createdAt: new Date(),
    });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("rejects duplicate email", async () => {
    await repo.save({
      id: "550e8400-e29b-41d4-a716-446655440004",
      email: "dup@test.com", name: "A", passwordHash: "h", createdAt: new Date(),
    });

    await expect(
      repo.save({
        id: "550e8400-e29b-41d4-a716-446655440005",
        email: "dup@test.com", name: "B", passwordHash: "h", createdAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Write group repository integration test**

Create `src/features/groups/infrastructure/__tests__/drizzle-group-repository.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { DrizzleGroupRepository } from "../drizzle-group-repository";
import { DrizzleUserRepository } from "@/features/auth/infrastructure/drizzle-user-repository";
import { testDb, truncateAllTables, closeConnection } from "@/test-utils/integration-setup";
import { User } from "@/features/auth/domain/user";
import { Group, GroupMember } from "../../domain/group";

describe("DrizzleGroupRepository", () => {
  const groupRepo = new DrizzleGroupRepository(testDb);
  const userRepo = new DrizzleUserRepository(testDb);

  const user1: User = {
    id: "550e8400-e29b-41d4-a716-446655440010",
    email: "u1@test.com", name: "U1", passwordHash: "h", createdAt: new Date(),
  };
  const user2: User = {
    id: "550e8400-e29b-41d4-a716-446655440011",
    email: "u2@test.com", name: "U2", passwordHash: "h", createdAt: new Date(),
  };

  beforeEach(async () => {
    await truncateAllTables();
    await userRepo.save(user1);
    await userRepo.save(user2);
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("saves and finds a group", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440020", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    const found = await groupRepo.findById(group.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Trip");
  });

  it("adds and finds members", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440021", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.addMember({ groupId: group.id, userId: user2.id, joinedAt: new Date() });

    const members = await groupRepo.findMembersByGroupId(group.id);
    expect(members).toHaveLength(2);
  });

  it("addMember is idempotent (onConflictDoNothing)", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440022", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });

    const members = await groupRepo.findMembersByGroupId(group.id);
    expect(members).toHaveLength(1);
  });

  it("isMember returns correct boolean", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440023", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });

    expect(await groupRepo.isMember(group.id, user1.id)).toBe(true);
    expect(await groupRepo.isMember(group.id, user2.id)).toBe(false);
  });

  it("removes a member", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440024", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.removeMember(group.id, user1.id);

    const members = await groupRepo.findMembersByGroupId(group.id);
    expect(members).toHaveLength(0);
  });

  it("findByUserId returns groups the user belongs to", async () => {
    const g1: Group = { id: "550e8400-e29b-41d4-a716-446655440025", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    const g2: Group = { id: "550e8400-e29b-41d4-a716-446655440026", name: "Office", createdBy: user2.id, createdAt: new Date() };
    await groupRepo.save(g1);
    await groupRepo.save(g2);
    await groupRepo.addMember({ groupId: g1.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.addMember({ groupId: g2.id, userId: user2.id, joinedAt: new Date() });

    const result = await groupRepo.findByUserId(user1.id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(g1.id);
  });
});
```

- [ ] **Step 5: Write expense and split repository integration tests**

Create `src/features/expenses/infrastructure/__tests__/drizzle-expense-repository.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { DrizzleExpenseRepository } from "../drizzle-expense-repository";
import { DrizzleExpenseSplitRepository } from "../drizzle-expense-split-repository";
import { DrizzleUserRepository } from "@/features/auth/infrastructure/drizzle-user-repository";
import { DrizzleGroupRepository } from "@/features/groups/infrastructure/drizzle-group-repository";
import { testDb, truncateAllTables, closeConnection } from "@/test-utils/integration-setup";

describe("DrizzleExpenseRepository + DrizzleExpenseSplitRepository", () => {
  const userRepo = new DrizzleUserRepository(testDb);
  const groupRepo = new DrizzleGroupRepository(testDb);
  const expenseRepo = new DrizzleExpenseRepository(testDb);
  const splitRepo = new DrizzleExpenseSplitRepository(testDb);

  const userId = "550e8400-e29b-41d4-a716-446655440030";
  const userId2 = "550e8400-e29b-41d4-a716-446655440031";
  const groupId = "550e8400-e29b-41d4-a716-446655440040";
  const expenseId = "550e8400-e29b-41d4-a716-446655440050";

  beforeEach(async () => {
    await truncateAllTables();
    await userRepo.save({ id: userId, email: "u1@test.com", name: "U1", passwordHash: "h", createdAt: new Date() });
    await userRepo.save({ id: userId2, email: "u2@test.com", name: "U2", passwordHash: "h", createdAt: new Date() });
    await groupRepo.save({ id: groupId, name: "Trip", createdBy: userId, createdAt: new Date() });
    await groupRepo.addMember({ groupId, userId, joinedAt: new Date() });
    await groupRepo.addMember({ groupId, userId: userId2, joinedAt: new Date() });
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("saves and finds an expense", async () => {
    await expenseRepo.save({
      id: expenseId, groupId, paidBy: userId, amount: 1000,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    const found = await expenseRepo.findById(expenseId);
    expect(found).not.toBeNull();
    expect(found!.amount).toBe(1000);
  });

  it("saves and retrieves splits", async () => {
    await expenseRepo.save({
      id: expenseId, groupId, paidBy: userId, amount: 1000,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "550e8400-e29b-41d4-a716-446655440060", expenseId, userId, amount: 500 },
      { id: "550e8400-e29b-41d4-a716-446655440061", expenseId, userId: userId2, amount: 500 },
    ]);

    const splits = await splitRepo.findByExpenseId(expenseId);
    expect(splits).toHaveLength(2);
  });

  it("cascade deletes splits when expense is deleted", async () => {
    await expenseRepo.save({
      id: expenseId, groupId, paidBy: userId, amount: 1000,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "550e8400-e29b-41d4-a716-446655440062", expenseId, userId, amount: 500 },
    ]);

    await expenseRepo.delete(expenseId);
    const splits = await splitRepo.findByExpenseId(expenseId);
    expect(splits).toHaveLength(0);
  });

  it("findByGroupId returns all expenses in a group", async () => {
    await expenseRepo.save({
      id: expenseId, groupId, paidBy: userId, amount: 500,
      description: "Lunch", type: "expense", createdAt: new Date(),
    });
    await expenseRepo.save({
      id: "550e8400-e29b-41d4-a716-446655440051", groupId, paidBy: userId2, amount: 300,
      description: "Coffee", type: "expense", createdAt: new Date(),
    });

    const expenses = await expenseRepo.findByGroupId(groupId);
    expect(expenses).toHaveLength(2);
  });

  it("findByGroupId on splitRepo returns all splits in a group", async () => {
    await expenseRepo.save({
      id: expenseId, groupId, paidBy: userId, amount: 1000,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await splitRepo.saveMany([
      { id: "550e8400-e29b-41d4-a716-446655440063", expenseId, userId, amount: 500 },
      { id: "550e8400-e29b-41d4-a716-446655440064", expenseId, userId: userId2, amount: 500 },
    ]);

    const splits = await splitRepo.findByGroupId(groupId);
    expect(splits).toHaveLength(2);
  });

  it("updates an expense", async () => {
    await expenseRepo.save({
      id: expenseId, groupId, paidBy: userId, amount: 1000,
      description: "Dinner", type: "expense", createdAt: new Date(),
    });
    await expenseRepo.update({
      id: expenseId, groupId, paidBy: userId, amount: 1500,
      description: "Updated Dinner", type: "expense", createdAt: new Date(),
    });

    const found = await expenseRepo.findById(expenseId);
    expect(found!.amount).toBe(1500);
    expect(found!.description).toBe("Updated Dinner");
  });
});
```

- [ ] **Step 5: Run integration tests**

```bash
npm run test:integration
```

Expected: All integration tests PASS (Docker must be running).

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: All unit + integration tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: add integration tests for Drizzle repositories"
```

---

## Task 14: Composition Root

**Files:**
- Create: `src/shared/infrastructure/di/container.ts`

- [ ] **Step 1: Create composition root**

Create `src/shared/infrastructure/di/container.ts`:

```typescript
import { db } from "../db/client";
import { DrizzleUserRepository } from "@/features/auth/infrastructure/drizzle-user-repository";
import { DrizzleGroupRepository } from "@/features/groups/infrastructure/drizzle-group-repository";
import { DrizzleExpenseRepository } from "@/features/expenses/infrastructure/drizzle-expense-repository";
import { DrizzleExpenseSplitRepository } from "@/features/expenses/infrastructure/drizzle-expense-split-repository";

import { RegisterHandler } from "@/features/auth/application/register-command";
import { GetAllUsersHandler } from "@/features/auth/application/get-all-users-query";
import { CreateGroupHandler } from "@/features/groups/application/create-group-command";
import { AddGroupMemberHandler } from "@/features/groups/application/add-group-member-command";
import { RemoveGroupMemberHandler } from "@/features/groups/application/remove-group-member-command";
import { GetUserGroupsHandler } from "@/features/groups/application/get-user-groups-query";
import { GetGroupDetailsHandler } from "@/features/groups/application/get-group-details-query";
import { CreateExpenseHandler } from "@/features/expenses/application/create-expense-command";
import { UpdateExpenseHandler } from "@/features/expenses/application/update-expense-command";
import { DeleteExpenseHandler } from "@/features/expenses/application/delete-expense-command";
import { CreateSettlementHandler } from "@/features/expenses/application/create-settlement-command";
import { DeleteSettlementHandler } from "@/features/expenses/application/delete-settlement-command";
import { GetGroupExpensesHandler } from "@/features/expenses/application/get-group-expenses-query";
import { GetGroupBalancesHandler } from "@/features/expenses/application/get-group-balances-query";

const userRepo = new DrizzleUserRepository(db);
const groupRepo = new DrizzleGroupRepository(db);
const expenseRepo = new DrizzleExpenseRepository(db);
const splitRepo = new DrizzleExpenseSplitRepository(db);

export const handlers = {
  register: new RegisterHandler(userRepo),
  getAllUsers: new GetAllUsersHandler(userRepo),
  createGroup: new CreateGroupHandler(groupRepo),
  addGroupMember: new AddGroupMemberHandler(groupRepo),
  removeGroupMember: new RemoveGroupMemberHandler(groupRepo, expenseRepo, splitRepo),
  getUserGroups: new GetUserGroupsHandler(groupRepo),
  getGroupDetails: new GetGroupDetailsHandler(groupRepo),
  createExpense: new CreateExpenseHandler(expenseRepo, splitRepo, groupRepo),
  updateExpense: new UpdateExpenseHandler(expenseRepo, splitRepo, groupRepo),
  deleteExpense: new DeleteExpenseHandler(expenseRepo, splitRepo),
  createSettlement: new CreateSettlementHandler(expenseRepo, splitRepo, groupRepo),
  deleteSettlement: new DeleteSettlementHandler(expenseRepo, splitRepo),
  getGroupExpenses: new GetGroupExpensesHandler(expenseRepo, splitRepo),
  getGroupBalances: new GetGroupBalancesHandler(expenseRepo, splitRepo, groupRepo),
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add composition root wiring all handlers with Drizzle repositories"
```

---

## Task 15: NextAuth Configuration + Middleware

**Files:**
- Create: `src/shared/infrastructure/auth/auth-options.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create NextAuth options**

Create `src/shared/infrastructure/auth/auth-options.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        const user = result[0];
        if (!user) return null;

        const isValid = await bcryptjs.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
```

- [ ] **Step 2: Create NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 3: Create middleware**

Create `middleware.ts` (project root, next to `next.config.ts`):

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/api/users/:path*",
    "/api/groups/:path*",
    "/api/expenses/:path*",
    "/api/settlements/:path*",
  ],
};
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth config with credentials provider and auth middleware"
```

---

## Task 16: API Route Handlers

**Files:**
- Create all route handler files under `src/app/api/`

- [ ] **Step 1: Create register endpoint**

Create `src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/shared/infrastructure/di/container";
import { RegisterCommand } from "@/features/auth/application/register-command";
import { registerSchema } from "@/shared/validation/auth-schemas";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const command = new RegisterCommand(parsed.data.email, parsed.data.name, parsed.data.password);
    const userId = await handlers.register.execute(command);
    return NextResponse.json({ userId }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Email already registered") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create users endpoint**

Create `src/app/api/users/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { handlers } from "@/shared/infrastructure/di/container";
import { GetAllUsersQuery } from "@/features/auth/application/get-all-users-query";

export async function GET() {
  const users = await handlers.getAllUsers.execute(new GetAllUsersQuery());
  return NextResponse.json(users);
}
```

- [ ] **Step 3: Create groups endpoints**

Create `src/app/api/groups/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { CreateGroupCommand } from "@/features/groups/application/create-group-command";
import { GetUserGroupsQuery } from "@/features/groups/application/get-user-groups-query";
import { createGroupSchema } from "@/shared/validation/group-schemas";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const command = new CreateGroupCommand(parsed.data.name, userId, parsed.data.memberIds);
  const groupId = await handlers.createGroup.execute(command);
  return NextResponse.json({ groupId }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const groups = await handlers.getUserGroups.execute(new GetUserGroupsQuery(userId));
  return NextResponse.json(groups);
}
```

- [ ] **Step 4: Create group detail, members, expenses, balances, settlements endpoints**

Create each route handler file following the same pattern:
- `src/app/api/groups/[id]/route.ts` — GET → GetGroupDetailsQuery (verify membership, 403 if not)
- `src/app/api/groups/[id]/members/route.ts` — POST → AddGroupMemberCommand
- `src/app/api/groups/[id]/members/[userId]/route.ts` — DELETE → RemoveGroupMemberCommand (409 on conflict)
- `src/app/api/groups/[id]/expenses/route.ts` — POST → CreateExpenseCommand, GET → GetGroupExpensesQuery
- `src/app/api/groups/[id]/balances/route.ts` — GET → GetGroupBalancesQuery
- `src/app/api/groups/[id]/settlements/route.ts` — POST → CreateSettlementCommand
- `src/app/api/expenses/[id]/route.ts` — PUT → UpdateExpenseCommand, DELETE → DeleteExpenseCommand (reject settlements with 400)
- `src/app/api/settlements/[id]/route.ts` — DELETE → DeleteSettlementCommand

Each handler: parse Zod → get session → verify membership (lookup expense's groupId for non-group-scoped routes) → call handler → return JSON response.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add all API route handlers with Zod validation and access control"
```

---

## Task 17: Frontend — Layout + Auth Pages

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/page.tsx`
- Create: `src/lib/utils.ts`, `src/lib/format.ts`

- [ ] **Step 1: Install and configure shadcn/ui**

```bash
npx shadcn@latest init
npx shadcn@latest add button input label card form toast
```

- [ ] **Step 2: Create utility files**

Create `src/lib/format.ts`:

```typescript
export function formatCents(cents: number): string {
  const value = cents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value);
}
```

- [ ] **Step 3: Create root page (redirect)**

Update `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 4: Create login page**

Create `src/app/login/page.tsx` — a form with email + password fields, calls `signIn("credentials")` from next-auth/react. Uses shadcn Card, Input, Button, Label. Link to `/register`.

- [ ] **Step 5: Create register page**

Create `src/app/register/page.tsx` — a form with email, name, password fields. Validates with `registerSchema` (Zod). POSTs to `/api/auth/register`. On success, redirects to `/login`. Uses shadcn components.

- [ ] **Step 6: Update layout with session provider**

Update `src/app/layout.tsx` to wrap children in a NextAuth `SessionProvider` (client component wrapper needed). Add Tailwind base styles, font configuration.

- [ ] **Step 7: Verify login/register flow manually**

```bash
npm run dev
```

Open `http://localhost:3000/register`, create an account. Open `/login`, sign in. Should redirect to `/dashboard` (will be empty at this point).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add login and register pages with shadcn/ui"
```

---

## Task 18: Frontend — Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

Create `src/app/dashboard/page.tsx` — client component that:
- Fetches `GET /api/groups` on mount
- Displays groups as a list of shadcn Cards (group name, member count)
- "New Group" button opens a dialog/form (group name + user multi-select from `GET /api/users`)
- Clicking a group navigates to `/groups/[id]`

Uses shadcn: Card, Button, Dialog, Input, Select/MultiSelect.

- [ ] **Step 2: Verify dashboard works**

Create a group via the UI. Should appear in the list. Click it — navigates to group page (not built yet).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dashboard page with group list and create group dialog"
```

---

## Task 19: Frontend — Group Detail Page

**Files:**
- Create: `src/app/groups/[id]/page.tsx`

- [ ] **Step 1: Create group detail page**

Create `src/app/groups/[id]/page.tsx` — client component with three sections:

**Member Balances section:**
- Fetches `GET /api/groups/[id]/balances`
- Shows each member with their balance (green if positive, red if negative)
- Uses `formatCents()` for display

**Expenses section:**
- Fetches `GET /api/groups/[id]/expenses`
- Lists expenses (description, amount, who paid, participants)
- Settlements shown differently ("X settled Y with Z")
- Edit button on expenses (opens form), delete button
- "Add Expense" button opens form (payer select, amount, description, participant checkboxes)
- "Settle Up" button opens settlement form (payer select, recipient select, amount)

**Members section:**
- Fetches `GET /api/groups/[id]` for group details + members
- List of members
- "Add Member" button (select from all users)
- "Remove" button per member (calls DELETE, shows error toast on 409)

All forms validate with shared Zod schemas. All mutations refetch data after success.

- [ ] **Step 2: End-to-end manual test**

Full flow: register 2+ users → create a group → add expense → check balances → settle up → verify balances zero out.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add group detail page with expenses, balances, and member management"
```

---

## Task 20: Final Cleanup and Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: All unit + integration tests PASS.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Fix any issues.

- [ ] **Step 3: Manual smoke test**

Full flow with `npm run dev`:
1. Register user A and user B
2. Log in as A
3. Create group "Dinner" with A and B
4. Add expense: A paid 100 PLN, participants A + B
5. Check balances: A = +50 PLN, B = -50 PLN
6. Settle: B pays A 50 PLN
7. Check balances: both 0

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and lint fixes"
```
