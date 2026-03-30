import { eq } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { users } from "@/shared/infrastructure/db/schema";
import { User } from "../domain/user";
import { IUserRepository } from "../domain/user-repository.interface";

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async save(user: User): Promise<void> {
    await this.db.insert(users).values({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    });
  }
}
