import { eq } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { expenses } from "@/shared/infrastructure/db/schema";
import { Expense, ExpenseType } from "../domain/expense";
import { IExpenseRepository } from "../domain/expense-repository.interface";

export class DrizzleExpenseRepository implements IExpenseRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Expense | null> {
    const result = await this.db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!result[0]) return null;
    return { ...result[0], type: result[0].type as ExpenseType };
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    const result = await this.db.select().from(expenses).where(eq(expenses.groupId, groupId));
    return result.map((row) => ({ ...row, type: row.type as ExpenseType }));
  }

  async save(expense: Expense): Promise<void> {
    await this.db.insert(expenses).values({
      id: expense.id,
      groupId: expense.groupId,
      paidBy: expense.paidBy,
      amount: expense.amount,
      description: expense.description,
      type: expense.type,
      createdAt: expense.createdAt,
    });
  }

  async update(expense: Expense): Promise<void> {
    await this.db
      .update(expenses)
      .set({
        paidBy: expense.paidBy,
        amount: expense.amount,
        description: expense.description,
      })
      .where(eq(expenses.id, expense.id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(expenses).where(eq(expenses.id, id));
  }
}
