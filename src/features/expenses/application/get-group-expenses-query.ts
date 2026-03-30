import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { Expense, ExpenseSplit } from "../domain/expense";

export class GetGroupExpensesQuery {
  constructor(public readonly groupId: string) {}
}

export interface ExpenseWithSplits {
  expense: Expense;
  splits: ExpenseSplit[];
}

export class GetGroupExpensesHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(query: GetGroupExpensesQuery): Promise<ExpenseWithSplits[]> {
    const expenses = await this.expenseRepo.findByGroupId(query.groupId);
    const result: ExpenseWithSplits[] = [];

    for (const expense of expenses) {
      const splits = await this.splitRepo.findByExpenseId(expense.id);
      result.push({ expense, splits });
    }

    return result;
  }
}
