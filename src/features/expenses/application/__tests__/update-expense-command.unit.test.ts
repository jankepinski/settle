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

  it("rejects when expense not found", async () => {
    const command = new UpdateExpenseCommand(
      "nonexistent",
      900,
      "Dinner",
      "u1",
      ["u1", "u2", "u3"],
    );
    await expect(handler.execute(command)).rejects.toThrow(/not found/i);
  });

  it("rejects when new payer is not a group member", async () => {
    const command = new UpdateExpenseCommand("e1", 900, "Dinner", "outsider", ["u1", "u2", "u3"]);
    await expect(handler.execute(command)).rejects.toThrow(/not a group member/i);
  });

  it("rejects when new participant is not a group member", async () => {
    const command = new UpdateExpenseCommand("e1", 900, "Dinner", "u1", ["u1", "outsider"]);
    await expect(handler.execute(command)).rejects.toThrow(/not a group member/i);
  });
});
