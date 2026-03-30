import { describe, it, expect, beforeEach } from "vitest";
import { RegisterCommand, RegisterHandler } from "../register-command";
import { InMemoryUserRepository } from "@/test-utils/in-memory-user-repository";

describe("RegisterHandler", () => {
  let userRepo: InMemoryUserRepository;
  let handler: RegisterHandler;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    handler = new RegisterHandler(userRepo);
  });

  it("creates a user and returns userId", async () => {
    const command = new RegisterCommand("test@example.com", "Test User", "password123");
    const userId = await handler.execute(command);

    expect(userId).toBeDefined();
    const user = await userRepo.findByEmail("test@example.com");
    expect(user).not.toBeNull();
    expect(user!.name).toBe("Test User");
    expect(user!.email).toBe("test@example.com");
  });

  it("hashes the password", async () => {
    const command = new RegisterCommand("test@example.com", "Test User", "password123");
    await handler.execute(command);

    const user = await userRepo.findByEmail("test@example.com");
    expect(user!.passwordHash).not.toBe("password123");
    expect(user!.passwordHash.length).toBeGreaterThan(0);
  });

  it("rejects duplicate email", async () => {
    const command = new RegisterCommand("test@example.com", "Test User", "password123");
    await handler.execute(command);

    const duplicate = new RegisterCommand("test@example.com", "Another User", "password456");
    await expect(handler.execute(duplicate)).rejects.toThrow("Email already registered");
  });
});
