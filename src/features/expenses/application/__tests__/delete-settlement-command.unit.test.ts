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
