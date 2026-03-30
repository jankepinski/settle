import { IExpenseRepository } from "../domain/expense-repository.interface";
import { IExpenseSplitRepository } from "../domain/expense-split-repository.interface";
import { IGroupRepository } from "@/features/groups/domain/group-repository.interface";

export class GetGroupBalancesQuery {
  constructor(public readonly groupId: string) {}
}

export interface MemberBalance {
  userId: string;
  balance: number;
}

export class GetGroupBalancesHandler {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly splitRepo: IExpenseSplitRepository,
    private readonly groupRepo: IGroupRepository,
  ) {}

  async execute(query: GetGroupBalancesQuery): Promise<MemberBalance[]> {
    const members = await this.groupRepo.findMembersByGroupId(query.groupId);
    const expenses = await this.expenseRepo.findByGroupId(query.groupId);
    const splits = await this.splitRepo.findByGroupId(query.groupId);

    const balanceMap = new Map<string, number>();
    for (const member of members) {
      balanceMap.set(member.userId, 0);
    }

    for (const expense of expenses) {
      const current = balanceMap.get(expense.paidBy) ?? 0;
      balanceMap.set(expense.paidBy, current + expense.amount);
    }

    for (const split of splits) {
      const current = balanceMap.get(split.userId) ?? 0;
      balanceMap.set(split.userId, current - split.amount);
    }

    return Array.from(balanceMap.entries()).map(([userId, balance]) => ({
      userId,
      balance,
    }));
  }
}
