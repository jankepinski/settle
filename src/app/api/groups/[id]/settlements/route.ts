import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { CreateSettlementCommand } from "@/features/expenses/application/create-settlement-command";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";
import { createSettlementSchema } from "@/shared/validation/expense-schemas";

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
