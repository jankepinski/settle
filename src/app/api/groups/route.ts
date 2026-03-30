import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { CreateGroupCommand } from "@/features/groups/application/create-group-command";
import { GetUserGroupsQuery } from "@/features/groups/application/get-user-groups-query";
import { createGroupSchema } from "@/shared/validation/group-schemas";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const command = new CreateGroupCommand(parsed.data.name, userId, parsed.data.memberIds);
  const groupId = await handlers.createGroup.execute(command);
  return NextResponse.json({ groupId }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const groups = await handlers.getUserGroups.execute(new GetUserGroupsQuery(userId));
  return NextResponse.json(groups);
}
