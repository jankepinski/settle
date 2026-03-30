"use client";

import { PencilIcon, TrashIcon, ArrowRightIcon } from "lucide-react";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExpenseRecord = {
  id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  description: string;
  type: "expense" | "settlement";
  createdAt: string;
};

type Split = {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
};

export function ExpenseItem({
  expense,
  splits,
  getUserName,
  onEdit,
  onDelete,
  className,
}: {
  expense: ExpenseRecord;
  splits: Split[];
  getUserName: (userId: string) => string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  const isSettlement = expense.type === "settlement";
  const recipientId = splits[0]?.userId ?? "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 transition-colors hover:bg-muted/30",
        className
      )}
    >
      <div className="flex items-center justify-center shrink-0 w-16 text-right">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatCents(expense.amount)}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {isSettlement ? (
          <>
            <span className="text-sm font-medium text-muted-foreground italic flex items-center gap-1.5">
              Settlement
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {getUserName(expense.paidBy)}
              <ArrowRightIcon className="size-3" />
              {getUserName(recipientId)}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium truncate">
              {expense.description || "Expense"}
            </span>
            <span className="text-xs text-muted-foreground">
              paid by {getUserName(expense.paidBy)}
              {splits.length > 0 && (
                <> &middot; split {splits.length} way</>
              )}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!isSettlement && onEdit && (
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <PencilIcon />
            <span className="sr-only">Edit expense</span>
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon-sm" onClick={onDelete}>
            <TrashIcon />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}
