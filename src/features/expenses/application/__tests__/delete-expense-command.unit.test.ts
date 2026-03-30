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
