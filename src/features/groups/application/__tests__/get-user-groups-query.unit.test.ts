import { describe, it, expect, beforeEach } from "vitest";
import { GetUserGroupsQuery, GetUserGroupsHandler } from "../get-user-groups-query";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("GetUserGroupsHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: GetUserGroupsHandler;

  beforeEach(() => {
    groupRepo = new InMemoryGroupRepository();
    handler = new GetUserGroupsHandler(groupRepo);
  });

  it("returns empty array when user has no groups", async () => {
    const result = await handler.execute(new GetUserGroupsQuery("u1"));
    expect(result).toEqual([]);
  });

  it("returns only groups the user is a member of", async () => {
    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.save({ id: "g2", name: "Office", createdBy: "u2", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g2", userId: "u2", joinedAt: new Date() });

    const result = await handler.execute(new GetUserGroupsQuery("u1"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});
