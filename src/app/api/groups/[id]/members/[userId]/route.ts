import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyGroupMembership } from "@/app/api/_lib/auth-utils";
import { handlers } from "@/shared/infrastructure/di/container";
import { RemoveGroupMemberCommand } from "@/features/groups/application/remove-group-member-command";

type Props = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId, userId: targetUserId } = await params;

  if (!(await verifyGroupMembership(groupId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await handlers.removeGroupMember.execute(new RemoveGroupMemberCommand(groupId, targetUserId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Cannot remove member")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
