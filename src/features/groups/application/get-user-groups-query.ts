import { IGroupRepository } from "../domain/group-repository.interface";
import { Group } from "../domain/group";

export class GetUserGroupsQuery {
  constructor(public readonly userId: string) {}
}

export class GetUserGroupsHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(query: GetUserGroupsQuery): Promise<Group[]> {
    return this.groupRepo.findByUserId(query.userId);
  }
}
