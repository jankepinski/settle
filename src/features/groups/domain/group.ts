export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  joinedAt: Date;
}
