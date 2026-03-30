export type ExpenseType = "expense" | "settlement";

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  description: string;
  type: ExpenseType;
  createdAt: Date;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
}
