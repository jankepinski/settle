import { v4 as uuidv4 } from "uuid";
import { ExpenseSplit } from "./expense";

export function calculateEqualSplits(
  expenseId: string,
  amount: number,
  participantIds: string[],
): ExpenseSplit[] {
  const sorted = [...participantIds].sort();
  const baseAmount = Math.floor(amount / sorted.length);
  const remainder = amount % sorted.length;

  return sorted.map((userId, index) => ({
    id: uuidv4(),
    expenseId,
    userId,
    amount: baseAmount + (index < remainder ? 1 : 0),
  }));
}
