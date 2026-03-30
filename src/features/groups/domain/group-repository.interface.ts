import { Group, GroupMember } from "./group";

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  findByUserId(userId: string): Promise<Group[]>;
  findMembersByGroupId(groupId: string): Promise<GroupMember[]>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  save(group: Group): Promise<void>;
  addMember(member: GroupMember): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
}
