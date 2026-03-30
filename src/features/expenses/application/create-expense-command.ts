import { v4 as uuidv4 } from "uuid";
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";
import { Expense } from "../domain/expense";
import { calculateEqualSplits } from "../domain/split-calculator";

export class CreateExpenseCommand {
  constructor(
    public readonly groupId: string,
    public readonly paidById: string,
    public readonly amount: number,
    public readonly description: string,
    public readonly participantIds: string[],
  ) {}
}

export class CreateExpenseHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: CreateExpenseCommand): Promise<string> {
    const isPayer = await this.groupRepo.isMember(command.groupId, command.paidById);
    if (!isPayer) {
      throw new Error(`User ${command.paidById} is not a group member`);
    }

    for (const pid of command.participantIds) {
      const isMember = await this.groupRepo.isMember(command.groupId, pid);
      if (!isMember) {
        throw new Error(`User ${pid} is not a group member`);
      }
    }

    const expense: Expense = {
      id: uuidv4(),
      groupId: command.groupId,
      paidBy: command.paidById,
      amount: command.amount,
      description: command.description,
      type: "expense",
      createdAt: new Date(),
    };

    await this.expenseRepo.save(expense);

    const splits = calculateEqualSplits(expense.id, command.amount, command.participantIds);
    await this.splitRepo.saveMany(splits);

    return expense.id;
  }
}
