import { Group, GroupMember } from "@/features/groups/domain/group";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";

export class InMemoryGroupRepository implements IGroupRepository {
  private groups: Group[] = [];
  private members: GroupMember[] = [];

  async findById(id: string): Promise<Group | null> {
    return this.groups.find((g) => g.id === id) ?? null;
  }

  async findByUserId(userId: string): Promise<Group[]> {
    const groupIds = this.members
      .filter((m) => m.userId === userId)
      .map((m) => m.groupId);
    return this.groups.filter((g) => groupIds.includes(g.id));
  }

  async findMembersByGroupId(groupId: string): Promise<GroupMember[]> {
    return this.members.filter((m) => m.groupId === groupId);
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    return this.members.some((m) => m.groupId === groupId && m.userId === userId);
  }

  async save(group: Group): Promise<void> {
    this.groups.push(group);
  }

  async addMember(member: GroupMember): Promise<void> {
    const exists = this.members.some(
      (m) => m.groupId === member.groupId && m.userId === member.userId,
    );
    if (!exists) {
      this.members.push(member);
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    this.members = this.members.filter(
      (m) => !(m.groupId === groupId && m.userId === userId),
    );
  }
}
