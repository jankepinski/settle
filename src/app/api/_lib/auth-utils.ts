import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user;
}

export async function verifyGroupMembership(groupId: string, userId: string): Promise<boolean> {
  try {
    const details = await handlers.getGroupDetails.execute(new GetGroupDetailsQuery(groupId));
    return details.members.some((m) => m.userId === userId);
  } catch {
    return false;
  }
}
