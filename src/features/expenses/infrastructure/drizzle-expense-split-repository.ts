import { eq, inArray } from "drizzle-orm";
import { Database } from "@/shared/infrastructure/db/client";
import { expenses, expenseSplits } from "@/shared/infrastructure/db/schema";
import { ExpenseSplit } from "../domain/expense";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";

export class DrizzleExpenseSplitRepository implements IExpenseSplitRepository {
  constructor(private readonly db: Database) {}

  async findByExpenseId(expenseId: string): Promise<ExpenseSplit[]> {
    return this.db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.expenseId, expenseId));
  }

  async findByGroupId(groupId: string): Promise<ExpenseSplit[]> {
    const groupExpenses = await this.db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.groupId, groupId));

    if (groupExpenses.length === 0) return [];

    const expenseIds = groupExpenses.map((e) => e.id);
    return this.db
      .select()
      .from(expenseSplits)
      .where(inArray(expenseSplits.expenseId, expenseIds));
  }

  async saveMany(splits: ExpenseSplit[]): Promise<void> {
    if (splits.length === 0) return;
    await this.db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: s.id,
        expenseId: s.expenseId,
        userId: s.userId,
        amount: s.amount,
      })),
    );
  }

  async deleteByExpenseId(expenseId: string): Promise<void> {
    await this.db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  }
}
