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
