import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-16 text-center animate-fade-in",
        className
      )}
    >
      <div className="rounded-2xl bg-muted/60 p-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      </div>
      {action}
    </div>
  );
}
