import { IGroupRepository } from "../domain/group-repository.interface";
import { GroupMember } from "../domain/group";

export class AddGroupMemberCommand {
  constructor(
    public readonly groupId: string,
    public readonly userId: string,
  ) {}
}

export class AddGroupMemberHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(command: AddGroupMemberCommand): Promise<void> {
    const group = await this.groupRepo.findById(command.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const member: GroupMember = {
      groupId: command.groupId,
      userId: command.userId,
      joinedAt: new Date(),
    };
    await this.groupRepo.addMember(member);
  }
}
