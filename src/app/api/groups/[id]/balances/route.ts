import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyGroupMembership } from "@/app/api/_lib/auth-utils";
import { handlers } from "@/shared/infrastructure/di/container";
import { GetGroupBalancesQuery } from "@/features/expenses/application/get-group-balances-query";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  if (!(await verifyGroupMembership(groupId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const balances = await handlers.getGroupBalances.execute(new GetGroupBalancesQuery(groupId));
  return NextResponse.json(balances);
}
