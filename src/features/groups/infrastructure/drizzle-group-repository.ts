import { eq, and, inArray } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { groups, groupMembers } from "@/shared/infrastructure/db/schema";
import { Group, GroupMember } from "../domain/group";
import { IGroupRepository } from "../domain/group-repository.interface";

export class DrizzleGroupRepository implements IGroupRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Group | null> {
    const result = await this.db.select().from(groups).where(eq(groups.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string): Promise<Group[]> {
    const memberRows = await this.db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    if (memberRows.length === 0) return [];

    const groupIds = memberRows.map((r) => r.groupId);
    return this.db.select().from(groups).where(inArray(groups.id, groupIds));
  }

  async findMembersByGroupId(groupId: string): Promise<GroupMember[]> {
    return this.db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    return result.length > 0;
  }

  async save(group: Group): Promise<void> {
    await this.db.insert(groups).values({
      id: group.id,
      name: group.name,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
    });
  }

  async addMember(member: GroupMember): Promise<void> {
    await this.db
      .insert(groupMembers)
      .values({
        groupId: member.groupId,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })
      .onConflictDoNothing();
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await this.db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }
}
