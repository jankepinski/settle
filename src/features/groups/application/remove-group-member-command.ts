import { IGroupRepository } from "../domain/group-repository.interface";
import { IExpenseRepository } from "@/features/expenses/domain/expense-repository.interface";
import { IExpenseSplitRepository } from "@/features/expenses/domain/expense-split-repository.interface";

export class RemoveGroupMemberCommand {
  constructor(
    public readonly groupId: string,
    public readonly userId: string,
  ) {}
}

export class RemoveGroupMemberHandler {
  constructor(
    private readonly groupRepo: IGroupRepository,
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
  ) {}

  async execute(command: RemoveGroupMemberCommand): Promise<void> {
    const expenses = await this.expenseRepo.findByGroupId(command.groupId);
    const isPayer = expenses.some((e) => e.paidBy === command.userId);
    if (isPayer) {
      throw new Error("Cannot remove member: they are the payer on existing expenses");
    }

    const splits = await this.splitRepo.findByGroupId(command.groupId);
    const hasSplits = splits.some((s) => s.userId === command.userId);
    if (hasSplits) {
      throw new Error("Cannot remove member: they appear in expense splits");
    }

    await this.groupRepo.removeMember(command.groupId, command.userId);
  }
}
