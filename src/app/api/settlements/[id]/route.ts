import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers, findExpenseById } from "@/shared/infrastructure/di/container";
import { DeleteSettlementCommand } from "@/features/expenses/application/delete-settlement-command";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: expenseId } = await params;
  const userId = (session.user as { id: string }).id;

  const expense = await findExpenseById(expenseId);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const details = await handlers.getGroupDetails.execute(new GetGroupDetailsQuery(expense.groupId));
    if (!details.members.some((m) => m.userId === userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  try {
    await handlers.deleteSettlement.execute(new DeleteSettlementCommand(expenseId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Not a settlement") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
