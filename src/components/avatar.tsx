import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-warm-amber/20 text-warm-amber-foreground",
  "bg-positive/15 text-positive",
  "bg-negative/15 text-negative",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function UserAvatar({
  name,
  size = "default",
  className,
}: {
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const initial = name.charAt(0).toUpperCase();
  const colorIndex = hashString(name) % AVATAR_COLORS.length;
  const colorClass = AVATAR_COLORS[colorIndex];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium shrink-0",
        colorClass,
        size === "sm" && "size-7 text-xs",
        size === "default" && "size-9 text-sm",
        size === "lg" && "size-11 text-base",
        className
      )}
    >
      {initial}
    </div>
  );
}
