import { v4 as uuidv4 } from "uuid";
import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";
import { Expense, ExpenseSplit } from "../domain/expense";

export class CreateSettlementCommand {
  constructor(
    public readonly groupId: string,
    public readonly paidById: string,
    public readonly recipientId: string,
    public readonly amount: number,
  ) {}
}

export class CreateSettlementHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(command: CreateSettlementCommand): Promise<string> {
    if (command.paidById === command.recipientId) {
      throw new Error("Payer and recipient must differ");
    }

    const isPayer = await this.groupRepo.isMember(command.groupId, command.paidById);
    if (!isPayer) {
      throw new Error(`User ${command.paidById} is not a group member`);
    }

    const isRecipient = await this.groupRepo.isMember(command.groupId, command.recipientId);
    if (!isRecipient) {
      throw new Error(`User ${command.recipientId} is not a group member`);
    }

    const expense: Expense = {
      id: uuidv4(),
      groupId: command.groupId,
      paidBy: command.paidById,
      amount: command.amount,
      description: "",
      type: "settlement",
      createdAt: new Date(),
    };

    await this.expenseRepo.save(expense);

    const split: ExpenseSplit = {
      id: uuidv4(),
      expenseId: expense.id,
      userId: command.recipientId,
      amount: command.amount,
    };
    await this.splitRepo.saveMany([split]);

    return expense.id;
  }
}
