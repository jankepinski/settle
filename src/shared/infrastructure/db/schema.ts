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
