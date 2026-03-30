import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyGroupMembership } from "@/app/api/_lib/auth-utils";
import { handlers } from "@/shared/infrastructure/di/container";
import { CreateExpenseCommand } from "@/features/expenses/application/create-expense-command";
import { GetGroupExpensesQuery } from "@/features/expenses/application/get-group-expenses-query";
import { createExpenseSchema } from "@/shared/validation/expense-schemas";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  if (!(await verifyGroupMembership(groupId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const command = new CreateExpenseCommand(
      groupId,
      parsed.data.paidById,
      parsed.data.amount,
      parsed.data.description,
      parsed.data.participantIds,
    );
    const expenseId = await handlers.createExpense.execute(command);
    return NextResponse.json({ expenseId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  if (!(await verifyGroupMembership(groupId, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = await handlers.getGroupExpenses.execute(new GetGroupExpensesQuery(groupId));
  return NextResponse.json(expenses);
}
