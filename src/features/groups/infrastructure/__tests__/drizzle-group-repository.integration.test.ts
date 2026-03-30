import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { DrizzleGroupRepository } from "../drizzle-group-repository";
import { DrizzleUserRepository } from "@/features/auth/infrastructure/drizzle-user-repository";
import { testDb, truncateAllTables, closeConnection } from "@/test-utils/integration-setup";
import { User } from "@/features/auth/domain/user";
import { Group } from "../../domain/group";

describe("DrizzleGroupRepository", () => {
  const groupRepo = new DrizzleGroupRepository(testDb);
  const userRepo = new DrizzleUserRepository(testDb);

  const user1: User = {
    id: "550e8400-e29b-41d4-a716-446655440010",
    email: "u1@test.com", name: "U1", passwordHash: "h", createdAt: new Date(),
  };
  const user2: User = {
    id: "550e8400-e29b-41d4-a716-446655440011",
    email: "u2@test.com", name: "U2", passwordHash: "h", createdAt: new Date(),
  };

  beforeEach(async () => {
    await truncateAllTables();
    await userRepo.save(user1);
    await userRepo.save(user2);
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("saves and finds a group", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440020", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    const found = await groupRepo.findById(group.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Trip");
  });

  it("adds and finds members", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440021", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.addMember({ groupId: group.id, userId: user2.id, joinedAt: new Date() });

    const members = await groupRepo.findMembersByGroupId(group.id);
    expect(members).toHaveLength(2);
  });

  it("addMember is idempotent (onConflictDoNothing)", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440022", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });

    const members = await groupRepo.findMembersByGroupId(group.id);
    expect(members).toHaveLength(1);
  });

  it("isMember returns correct boolean", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440023", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });

    expect(await groupRepo.isMember(group.id, user1.id)).toBe(true);
    expect(await groupRepo.isMember(group.id, user2.id)).toBe(false);
  });

  it("removes a member", async () => {
    const group: Group = { id: "550e8400-e29b-41d4-a716-446655440024", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    await groupRepo.save(group);
    await groupRepo.addMember({ groupId: group.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.removeMember(group.id, user1.id);

    const members = await groupRepo.findMembersByGroupId(group.id);
    expect(members).toHaveLength(0);
  });

  it("findByUserId returns groups the user belongs to", async () => {
    const g1: Group = { id: "550e8400-e29b-41d4-a716-446655440025", name: "Trip", createdBy: user1.id, createdAt: new Date() };
    const g2: Group = { id: "550e8400-e29b-41d4-a716-446655440026", name: "Office", createdBy: user2.id, createdAt: new Date() };
    await groupRepo.save(g1);
    await groupRepo.save(g2);
    await groupRepo.addMember({ groupId: g1.id, userId: user1.id, joinedAt: new Date() });
    await groupRepo.addMember({ groupId: g2.id, userId: user2.id, joinedAt: new Date() });

    const result = await groupRepo.findByUserId(user1.id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(g1.id);
  });
});
