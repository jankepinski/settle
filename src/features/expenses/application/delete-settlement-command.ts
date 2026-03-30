import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";

export class DeleteSettlementCommand {
  constructor(public readonly expenseId: string) {}
}

export class DeleteSettlementHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(command: DeleteSettlementCommand): Promise<void> {
    const expense = await this.expenseRepo.findById(command.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    if (expense.type !== "settlement") {
      throw new Error("Not a settlement");
    }

    await this.splitRepo.deleteByExpenseId(command.expenseId);
    await this.expenseRepo.delete(command.expenseId);
  }
}
