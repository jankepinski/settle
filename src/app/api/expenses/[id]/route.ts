import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers, findExpenseById } from "@/shared/infrastructure/di/container";
import { UpdateExpenseCommand } from "@/features/expenses/application/update-expense-command";
import { DeleteExpenseCommand } from "@/features/expenses/application/delete-expense-command";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";
import { updateExpenseSchema } from "@/shared/validation/expense-schemas";

type Props = { params: Promise<{ id: string }> };

async function verifyExpenseMembership(expenseId: string, userId: string) {
  const expense = await findExpenseById(expenseId);
  if (!expense) return { expense: null, allowed: false };

  try {
    const details = await handlers.getGroupDetails.execute(new GetGroupDetailsQuery(expense.groupId));
    const allowed = details.members.some((m) => m.userId === userId);
    return { expense, allowed };
  } catch {
    return { expense, allowed: false };
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: expenseId } = await params;
  const userId = (session.user as { id: string }).id;

  const { expense, allowed } = await verifyExpenseMembership(expenseId, userId);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const command = new UpdateExpenseCommand(
      expenseId,
      parsed.data.amount,
      parsed.data.description,
      parsed.data.paidById,
      parsed.data.participantIds,
    );
    await handlers.updateExpense.execute(command);
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Cannot update a settlement") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: expenseId } = await params;
  const userId = (session.user as { id: string }).id;

  const { expense, allowed } = await verifyExpenseMembership(expenseId, userId);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await handlers.deleteExpense.execute(new DeleteExpenseCommand(expenseId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("Use DeleteSettlementCommand")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
