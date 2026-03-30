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
