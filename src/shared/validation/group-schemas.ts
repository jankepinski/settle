import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  memberIds: z.array(z.string().uuid()).default([]),
});

export const addGroupMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
