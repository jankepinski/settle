import { IGroupRepository } from "../domain/group-repository.interface";
import { Group, GroupMember } from "../domain/group";

export class GetGroupDetailsQuery {
  constructor(public readonly groupId: string) {}
}

export interface GroupDetails {
  group: Group;
  members: GroupMember[];
}

export class GetGroupDetailsHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(query: GetGroupDetailsQuery): Promise<GroupDetails> {
    const group = await this.groupRepo.findById(query.groupId);
    if (!group) {
      throw new Error("Group not found");
    }
    const members = await this.groupRepo.findMembersByGroupId(query.groupId);
    return { group, members };
  }
}
