import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyGroupMembership } from "@/app/api/_lib/auth-utils";
import { handlers, findExpenseById } from "@/shared/infrastructure/di/container";
import { UpdateExpenseCommand } from "@/features/expenses/application/update-expense-command";
import { DeleteExpenseCommand } from "@/features/expenses/application/delete-expense-command";
import { updateExpenseSchema } from "@/shared/validation/expense-schemas";

type Props = { params: Promise<{ id: string }> };

async function verifyExpenseMembership(expenseId: string, userId: string) {
  const expense = await findExpenseById(expenseId);
  if (!expense) return { expense: null, allowed: false };

  const allowed = await verifyGroupMembership(expense.groupId, userId);
  return { expense, allowed };
}

export async function PUT(request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: expenseId } = await params;

  const { expense, allowed } = await verifyExpenseMembership(expenseId, user.id);
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
    const message = error instanceof Error ? error.message : "";
    if (message === "Cannot update a settlement") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: expenseId } = await params;

  const { expense, allowed } = await verifyExpenseMembership(expenseId, user.id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await handlers.deleteExpense.execute(new DeleteExpenseCommand(expenseId));
    return NextResponse.json({}, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Use DeleteSettlementCommand")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
