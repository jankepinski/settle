import { db } from "../db/client";
import { DrizzleUserRepository } from "@/features/auth/infrastructure/drizzle-user-repository";
import { DrizzleGroupRepository } from "@/features/groups/infrastructure/drizzle-group-repository";
import { DrizzleExpenseRepository } from "@/features/expenses/infrastructure/drizzle-expense-repository";
import { DrizzleExpenseSplitRepository } from "@/features/expenses/infrastructure/drizzle-expense-split-repository";

import { RegisterHandler } from "@/features/auth/application/register-command";
import { GetAllUsersHandler } from "@/features/auth/application/get-all-users-query";
import { CreateGroupHandler } from "@/features/groups/application/create-group-command";
import { AddGroupMemberHandler } from "@/features/groups/application/add-group-member-command";
import { RemoveGroupMemberHandler } from "@/features/groups/application/remove-group-member-command";
import { GetUserGroupsHandler } from "@/features/groups/application/get-user-groups-query";
import { GetGroupDetailsHandler } from "@/features/groups/application/get-group-details-query";
import { CreateExpenseHandler } from "@/features/expenses/application/create-expense-command";
import { UpdateExpenseHandler } from "@/features/expenses/application/update-expense-command";
import { DeleteExpenseHandler } from "@/features/expenses/application/delete-expense-command";
import { CreateSettlementHandler } from "@/features/expenses/application/create-settlement-command";
import { DeleteSettlementHandler } from "@/features/expenses/application/delete-settlement-command";
import { GetGroupExpensesHandler } from "@/features/expenses/application/get-group-expenses-query";
import { GetGroupBalancesHandler } from "@/features/expenses/application/get-group-balances-query";

const userRepo = new DrizzleUserRepository(db);
const groupRepo = new DrizzleGroupRepository(db);
const expenseRepo = new DrizzleExpenseRepository(db);
const splitRepo = new DrizzleExpenseSplitRepository(db);

export async function findExpenseById(id: string) {
  return expenseRepo.findById(id);
}

export const handlers = {
  register: new RegisterHandler(userRepo),
  getAllUsers: new GetAllUsersHandler(userRepo),
  createGroup: new CreateGroupHandler(groupRepo),
  addGroupMember: new AddGroupMemberHandler(groupRepo),
  removeGroupMember: new RemoveGroupMemberHandler(groupRepo, expenseRepo, splitRepo),
  getUserGroups: new GetUserGroupsHandler(groupRepo),
  getGroupDetails: new GetGroupDetailsHandler(groupRepo),
  createExpense: new CreateExpenseHandler(expenseRepo, splitRepo, groupRepo),
  updateExpense: new UpdateExpenseHandler(expenseRepo, splitRepo, groupRepo),
  deleteExpense: new DeleteExpenseHandler(expenseRepo, splitRepo),
  createSettlement: new CreateSettlementHandler(expenseRepo, splitRepo, groupRepo),
  deleteSettlement: new DeleteSettlementHandler(expenseRepo, splitRepo),
  getGroupExpenses: new GetGroupExpensesHandler(expenseRepo, splitRepo),
  getGroupBalances: new GetGroupBalancesHandler(expenseRepo, splitRepo, groupRepo),
} as const;
