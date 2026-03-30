import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { DrizzleUserRepository } from "../drizzle-user-repository";
import { testDb, truncateAllTables, closeConnection } from "@/test-utils/integration-setup";
import { User } from "../../domain/user";

describe("DrizzleUserRepository", () => {
  const repo = new DrizzleUserRepository(testDb);

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("saves and finds a user by id", async () => {
    const user: User = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@example.com",
      name: "Test",
      passwordHash: "hash",
      createdAt: new Date(),
    };
    await repo.save(user);

    const found = await repo.findById(user.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe("test@example.com");
  });

  it("finds a user by email", async () => {
    const user: User = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      email: "find@example.com",
      name: "Find",
      passwordHash: "hash",
      createdAt: new Date(),
    };
    await repo.save(user);

    const found = await repo.findByEmail("find@example.com");
    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
  });

  it("returns null for non-existent user", async () => {
    const found = await repo.findById("550e8400-e29b-41d4-a716-446655440099");
    expect(found).toBeNull();
  });

  it("finds all users", async () => {
    await repo.save({
      id: "550e8400-e29b-41d4-a716-446655440002",
      email: "a@test.com", name: "A", passwordHash: "h", createdAt: new Date(),
    });
    await repo.save({
      id: "550e8400-e29b-41d4-a716-446655440003",
      email: "b@test.com", name: "B", passwordHash: "h", createdAt: new Date(),
    });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("rejects duplicate email", async () => {
    await repo.save({
      id: "550e8400-e29b-41d4-a716-446655440004",
      email: "dup@test.com", name: "A", passwordHash: "h", createdAt: new Date(),
    });

    await expect(
      repo.save({
        id: "550e8400-e29b-41d4-a716-446655440005",
        email: "dup@test.com", name: "B", passwordHash: "h", createdAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});
