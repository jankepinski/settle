import { ExpenseSplit } from "./expense";

export interface IExpenseSplitRepository {
  findByExpenseId(expenseId: string): Promise<ExpenseSplit[]>;
  findByGroupId(groupId: string): Promise<ExpenseSplit[]>;
  saveMany(splits: ExpenseSplit[]): Promise<void>;
  deleteByExpenseId(expenseId: string): Promise<void>;
}
