import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { RemoveGroupMemberCommand } from "@/features/groups/application/remove-group-member-command";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";

type Props = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId, userId: targetUserId } = await params;
  const sessionUserId = (session.user as { id: string }).id;

  try {
    const details = await handlers.getGroupDetails.execute(new GetGroupDetailsQuery(groupId));
    if (!details.members.some((m) => m.userId === sessionUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  try {
    await handlers.removeGroupMember.execute(new RemoveGroupMemberCommand(groupId, targetUserId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("Cannot remove member")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
