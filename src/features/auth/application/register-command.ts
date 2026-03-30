import { v4 as uuidv4 } from "uuid";
import bcryptjs from "bcryptjs";
import { IUserRepository } from "../domain/user-repository.interface";
import { User } from "../domain/user";

export class RegisterCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
  ) {}
}

export class RegisterHandler {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(command: RegisterCommand): Promise<string> {
    const existing = await this.userRepo.findByEmail(command.email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const user: User = {
      id: uuidv4(),
      email: command.email,
      name: command.name,
      passwordHash: await bcryptjs.hash(command.password, 10),
      createdAt: new Date(),
    };

    await this.userRepo.save(user);
    return user.id;
  }
}
