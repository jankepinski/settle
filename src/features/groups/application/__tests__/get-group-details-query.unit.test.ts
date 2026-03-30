import { describe, it, expect, beforeEach } from "vitest";
import { GetGroupDetailsQuery, GetGroupDetailsHandler } from "../get-group-details-query";
import { InMemoryGroupRepository } from "@/test-utils/in-memory-group-repository";

describe("GetGroupDetailsHandler", () => {
  let groupRepo: InMemoryGroupRepository;
  let handler: GetGroupDetailsHandler;

  beforeEach(async () => {
    groupRepo = new InMemoryGroupRepository();
    handler = new GetGroupDetailsHandler(groupRepo);
    await groupRepo.save({ id: "g1", name: "Trip", createdBy: "u1", createdAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u1", joinedAt: new Date() });
    await groupRepo.addMember({ groupId: "g1", userId: "u2", joinedAt: new Date() });
  });

  it("returns group with members", async () => {
    const result = await handler.execute(new GetGroupDetailsQuery("g1"));
    expect(result.group.name).toBe("Trip");
    expect(result.members).toHaveLength(2);
  });

  it("throws when group not found", async () => {
    await expect(handler.execute(new GetGroupDetailsQuery("nonexistent"))).rejects.toThrow(
      "Group not found",
    );
  });
});
