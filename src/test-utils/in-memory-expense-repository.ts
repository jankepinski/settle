import { Expense } from "@/features/expenses/domain/expense";
import { IExpenseRepository } from "@/features/expenses/domain/expense-repository.interface";

export class InMemoryExpenseRepository implements IExpenseRepository {
  private expenses: Expense[] = [];

  async findById(id: string): Promise<Expense | null> {
    return this.expenses.find((e) => e.id === id) ?? null;
  }

  async findByGroupId(groupId: string): Promise<Expense[]> {
    return this.expenses.filter((e) => e.groupId === groupId);
  }

  async save(expense: Expense): Promise<void> {
    this.expenses.push(expense);
  }

  async update(expense: Expense): Promise<void> {
    const index = this.expenses.findIndex((e) => e.id === expense.id);
    if (index !== -1) {
      this.expenses[index] = expense;
    }
  }

  async delete(id: string): Promise<void> {
    this.expenses = this.expenses.filter((e) => e.id !== id);
  }
}
