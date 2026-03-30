import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyGroupMembership } from "@/app/api/_lib/auth-utils";
import { handlers } from "@/shared/infrastructure/di/container";
import { AddGroupMemberCommand } from "@/features/groups/application/add-group-member-command";
import { addGroupMemberSchema } from "@/shared/validation/group-schemas";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  if (!(await verifyGroupMembership(groupId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = addGroupMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await handlers.addGroupMember.execute(new AddGroupMemberCommand(groupId, parsed.data.userId));
    return NextResponse.json({}, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
