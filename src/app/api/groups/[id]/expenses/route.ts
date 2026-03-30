import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { CreateExpenseCommand } from "@/features/expenses/application/create-expense-command";
import { GetGroupExpensesQuery } from "@/features/expenses/application/get-group-expenses-query";
import { GetGroupDetailsQuery } from "@/features/groups/application/get-group-details-query";
import { createExpenseSchema } from "@/shared/validation/expense-schemas";

type Props = { params: Promise<{ id: string }> };

async function verifyMembership(groupId: string, userId: string): Promise<boolean> {
  try {
    const details = await handlers.getGroupDetails.execute(new GetGroupDetailsQuery(groupId));
    return details.members.some((m) => m.userId === userId);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;
  const userId = (session.user as { id: string }).id;

  if (!(await verifyMembership(groupId, userId))) {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(_request: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;
  const userId = (session.user as { id: string }).id;

  if (!(await verifyMembership(groupId, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expenses = await handlers.getGroupExpenses.execute(new GetGroupExpensesQuery(groupId));
  return NextResponse.json(expenses);
}
