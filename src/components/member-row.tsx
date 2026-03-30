"use client";

import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./avatar";
import { cn } from "@/lib/utils";

export function MemberRow({
  name,
  onRemove,
  className,
}: {
  name: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-border/60 px-4 py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <UserAvatar name={name} size="sm" />
        <span className="text-sm font-medium">{name}</span>
      </div>
      {onRemove && (
        <Button variant="ghost" size="icon-sm" onClick={onRemove}>
          <TrashIcon />
          <span className="sr-only">Remove member</span>
        </Button>
      )}
    </div>
  );
}
