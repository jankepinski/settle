import { IUserRepository } from "../domain/user-repository.interface";
import { UserDTO, toUserDTO } from "../domain/user";

export class GetAllUsersQuery {}

export class GetAllUsersHandler {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(_query: GetAllUsersQuery): Promise<UserDTO[]> {
    const users = await this.userRepo.findAll();
    return users.map(toUserDTO);
  }
}
