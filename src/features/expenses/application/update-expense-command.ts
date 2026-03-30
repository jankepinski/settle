import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";
import { calculateEqualSplits } from "../domain/split-calculator";

export class UpdateExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly paidById: string,
    public readonly participantIds: string[],
  ) {}
}

export class UpdateExpenseHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: UpdateExpenseCommand): Promise<void> {
    const expense = await this.expenseRepo.findById(command.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    if (expense.type === "settlement") {
      throw new Error("Cannot update a settlement");
    }

    const isPayer = await this.groupRepo.isMember(expense.groupId, command.paidById);
    if (!isPayer) {
      throw new Error(`User ${command.paidById} is not a group member`);
    }

    for (const pid of command.participantIds) {
      const isMember = await this.groupRepo.isMember(expense.groupId, pid);
      if (!isMember) {
        throw new Error(`User ${pid} is not a group member`);
      }
    }

    const updated = {
      ...expense,
      amount: command.amount,
      description: command.description,
      paidBy: command.paidById,
    };
    await this.expenseRepo.update(updated);

    await this.splitRepo.deleteByExpenseId(command.expenseId);
    const splits = calculateEqualSplits(command.expenseId, command.amount, command.participantIds);
    await this.splitRepo.saveMany(splits);
  }
}
