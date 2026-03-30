import { v4 as uuidv4 } from "uuid";
import { IGroupRepository } from "../domain/group-repository.interface";
import { Group, GroupMember } from "../domain/group";

export class CreateGroupCommand {
  constructor(
    public readonly name: string,
    public readonly creatorId: string,
    public readonly memberIds: string[],
  ) {}
}

export class CreateGroupHandler {
  constructor(private readonly groupRepo: IGroupRepository) {}

  async execute(command: CreateGroupCommand): Promise<string> {
    const group: Group = {
      id: uuidv4(),
      name: command.name,
      createdBy: command.creatorId,
      createdAt: new Date(),
    };

    await this.groupRepo.save(group);

    const uniqueMembers = new Set([command.creatorId, ...command.memberIds]);
    for (const userId of uniqueMembers) {
      const member: GroupMember = {
        groupId: group.id,
        userId,
        joinedAt: new Date(),
      };
      await this.groupRepo.addMember(member);
    }

    return group.id;
  }
}
