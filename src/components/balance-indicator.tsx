import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";

export function BalanceIndicator({
  balance,
  className,
}: {
  balance: number;
  className?: string;
}) {
  const isPositive = balance > 0;
  const isNegative = balance < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold font-mono tabular-nums",
        isPositive && "bg-positive/10 text-positive",
        isNegative && "bg-negative/10 text-negative",
        !isPositive && !isNegative && "bg-muted text-muted-foreground",
        className
      )}
    >
      {isPositive ? "+" : ""}
      {formatCents(balance)}
    </span>
  );
}
