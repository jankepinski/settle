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
