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
