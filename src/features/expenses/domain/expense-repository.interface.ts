import { Expense } from "./expense";

export interface IExpenseRepository {
  findById(id: string): Promise<Expense | null>;
  findByGroupId(groupId: string): Promise<Expense[]>;
  save(expense: Expense): Promise<void>;
  update(expense: Expense): Promise<void>;
  delete(id: string): Promise<void>;
}
