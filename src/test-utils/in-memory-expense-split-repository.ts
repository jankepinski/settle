import { ExpenseSplit } from "@/features/expenses/domain/expense";
import { IExpenseSplitRepository } from "@/features/expenses/domain/expense-split-repository.interface";

export class InMemoryExpenseSplitRepository implements IExpenseSplitRepository {
  private splits: ExpenseSplit[] = [];

  async findByExpenseId(expenseId: string): Promise<ExpenseSplit[]> {
    return this.splits.filter((s) => s.expenseId === expenseId);
  }

  async findByGroupId(groupId: string): Promise<ExpenseSplit[]> {
    void groupId;
    return [...this.splits];
  }

  async saveMany(splits: ExpenseSplit[]): Promise<void> {
    this.splits.push(...splits);
  }

  async deleteByExpenseId(expenseId: string): Promise<void> {
    this.splits = this.splits.filter((s) => s.expenseId !== expenseId);
  }
}
