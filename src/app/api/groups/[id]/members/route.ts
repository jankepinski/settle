import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { AddGroupMemberCommand } from "@/features/groups/application/add-group-member-command";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";
import { addGroupMemberSchema } from "@/shared/validation/group-schemas";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;
  const userId = (session.user as { id: string }).id;

  try {
    const details = await handlers.getGroupDetails.execute(new GetGroupDetailsQuery(groupId));
    if (!details.members.some((m) => m.userId === userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = addGroupMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    await handlers.addGroupMember.execute(new AddGroupMemberCommand(groupId, parsed.data.userId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
