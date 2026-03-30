import { describe, it, expect, beforeEach } from "vitest";
import { GetAllUsersQuery, GetAllUsersHandler } from "../get-all-users-query";
import { InMemoryUserRepository } from "@/test-utils/in-memory-user-repository";
import { User } from "../../domain/user";

describe("GetAllUsersHandler", () => {
  let userRepo: InMemoryUserRepository;
  let handler: GetAllUsersHandler;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    handler = new GetAllUsersHandler(userRepo);
  });

  it("returns empty array when no users exist", async () => {
    const result = await handler.execute(new GetAllUsersQuery());
    expect(result).toEqual([]);
  });

  it("returns users as DTOs without passwordHash", async () => {
    const user: User = {
      id: "u1",
      email: "a@test.com",
      name: "Alice",
      passwordHash: "secret-hash",
      createdAt: new Date(),
    };
    await userRepo.save(user);

    const result = await handler.execute(new GetAllUsersQuery());
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "u1", email: "a@test.com", name: "Alice" });
    expect((result[0] as Record<string, unknown>).passwordHash).toBeUndefined();
  });
});
