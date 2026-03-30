import { z } from "zod";

export const createExpenseSchema = z.object({
  paidById: z.string().uuid(),
  amount: z.number().int().positive(),
  description: z.string().min(1).max(500),
  participantIds: z.array(z.string().uuid()).min(1),
});

export const updateExpenseSchema = z.object({
  paidById: z.string().uuid(),
  amount: z.number().int().positive(),
  description: z.string().min(1).max(500),
  participantIds: z.array(z.string().uuid()).min(1),
});

export const createSettlementSchema = z.object({
  paidById: z.string().uuid(),
  recipientId: z.string().uuid(),
  amount: z.number().int().positive(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
