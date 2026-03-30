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

  it("rejects when group does not exist", async () => {
    await expect(
      handler.execute(new RemoveGroupMemberCommand("g-nonexistent", "u1")),
    ).rejects.toThrow("Group not found");
  });

  it("rejects when user is not a member", async () => {
    const localGroupRepo = new InMemoryGroupRepository();
    const localExpenseRepo = new InMemoryExpenseRepository();
    const localSplitRepo = new InMemoryExpenseSplitRepository();
    const localHandler = new RemoveGroupMemberHandler(
      localGroupRepo,
      localExpenseRepo,
      localSplitRepo,
    );
    await localGroupRepo.save({
      id: "g1",
      name: "Trip",
      createdBy: "u1",
      createdAt: new Date(),
    });
    await localGroupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });

    await expect(
      localHandler.execute(new RemoveGroupMemberCommand("g1", "u3")),
    ).rejects.toThrow("not a member");
  });

  it("removes a member with no expenses", async () => {
    await handler.execute(new RemoveGroupMemberCommand("g1", "u2"));
    const members = await groupRepo.findMembersByGroupId("g1");
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe("u1");
  });

  it("rejects when member is paidBy on an expense", async () => {
    await expenseRepo.save({
      id: "e1",
      groupId: "g1",
      paidBy: "u2",
      amount: 100,
      description: "Dinner",
      type: "expense",
      createdAt: new Date(),
    });

    await expect(
      handler.execute(new RemoveGroupMemberCommand("g1", "u2")),
    ).rejects.toThrow("Cannot remove member");
  });

  it("rejects when member has expense splits", async () => {
    await expenseRepo.save({
      id: "e1",
      groupId: "g1",
      paidBy: "u1",
      amount: 100,
      description: "Dinner",
      type: "expense",
      createdAt: new Date(),
    });
    await splitRepo.saveMany([{ id: "s1", expenseId: "e1", userId: "u2", amount: 50 }]);

    await expect(
      handler.execute(new RemoveGroupMemberCommand("g1", "u2")),
    ).rejects.toThrow("Cannot remove member");
  });
});
