import { describe, it, expect } from "vitest";
import { calculateEqualSplits } from "../split-calculator";

describe("calculateEqualSplits", () => {
  it("splits evenly when divisible", () => {
    const splits = calculateEqualSplits("exp-1", 900, ["a", "b", "c"]);
    expect(splits).toHaveLength(3);
    expect(splits.every((s) => s.amount === 300)).toBe(true);
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(900);
  });

  it("distributes remainder to first N participants (sorted by userId)", () => {
    const splits = calculateEqualSplits("exp-1", 100, ["c", "a", "b"]);
    expect(splits).toHaveLength(3);
    const byUser = Object.fromEntries(splits.map((s) => [s.userId, s.amount]));
    expect(byUser["a"]).toBe(34);
    expect(byUser["b"]).toBe(33);
    expect(byUser["c"]).toBe(33);
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(100);
  });

  it("handles single participant", () => {
    const splits = calculateEqualSplits("exp-1", 500, ["a"]);
    expect(splits).toHaveLength(1);
    expect(splits[0].amount).toBe(500);
  });

  it("assigns correct expenseId to all splits", () => {
    const splits = calculateEqualSplits("exp-42", 200, ["a", "b"]);
    expect(splits.every((s) => s.expenseId === "exp-42")).toBe(true);
  });

  it("generates unique ids for each split", () => {
    const splits = calculateEqualSplits("exp-1", 300, ["a", "b", "c"]);
    const ids = splits.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });
});
