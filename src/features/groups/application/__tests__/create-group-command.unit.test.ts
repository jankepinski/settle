import { describe, it, expect, beforeEach } from "vitest";
import { CreateGroupCommand, CreateGroupHandler } from "../create-group-command";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("CreateGroupHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: CreateGroupHandler;

  beforeEach(() => {
    groupRepo = new InMemoryGroupRepository();
    handler = new CreateGroupHandler(groupRepo);
  });

  it("creates a group with creator as member", async () => {
    const command = new CreateGroupCommand("Trip", "creator-1", []);
    const groupId = await handler.execute(command);

    const group = await groupRepo.findById(groupId);
    expect(group).not.toBeNull();
    expect(group!.name).toBe("Trip");
    expect(group!.createdBy).toBe("creator-1");

    const members = await groupRepo.findMembersByGroupId(groupId);
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe("creator-1");
  });

  it("adds additional members", async () => {
    const command = new CreateGroupCommand("Trip", "creator-1", ["user-2", "user-3"]);
    const groupId = await handler.execute(command);

    const members = await groupRepo.findMembersByGroupId(groupId);
    expect(members).toHaveLength(3);
    const userIds = members.map((m) => m.userId).sort();
    expect(userIds).toEqual(["creator-1", "user-2", "user-3"]);
  });

  it("deduplicates creator in memberIds", async () => {
    const command = new CreateGroupCommand("Trip", "creator-1", ["creator-1", "user-2"]);
    const groupId = await handler.execute(command);

    const members = await groupRepo.findMembersByGroupId(groupId);
    expect(members).toHaveLength(2);
  });
});
