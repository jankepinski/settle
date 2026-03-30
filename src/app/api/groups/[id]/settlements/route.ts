import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyGroupMembership } from "@/app/api/_lib/auth-utils";
import { handlers } from "@/shared/infrastructure/di/container";
import { CreateSettlementCommand } from "@/features/expenses/application/create-settlement-command";
import { createSettlementSchema } from "@/shared/validation/expense-schemas";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  if (!(await verifyGroupMembership(groupId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSettlementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const command = new CreateSettlementCommand(
      groupId,
      parsed.data.paidById,
      parsed.data.recipientId,
      parsed.data.amount,
    );
    const expenseId = await handlers.createSettlement.execute(command);
    return NextResponse.json({ expenseId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
