import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { GetGroupBalancesQuery } from "@/features/expenses/application/get-group-balances-query";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Props) {
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

  const balances = await handlers.getGroupBalances.execute(new GetGroupBalancesQuery(groupId));
  return NextResponse.json(balances);
}
