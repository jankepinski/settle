import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { DeleteSettlementCommand } from "@/features/expenses/application/delete-settlement-command";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: expenseId } = await params;

  try {
    await handlers.deleteSettlement.execute(new DeleteSettlementCommand(expenseId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Not a settlement") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "Expense not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
