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
