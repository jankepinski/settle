import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "font-display italic tracking-tight text-primary select-none",
        size === "sm" && "text-lg",
        size === "default" && "text-2xl",
        size === "lg" && "text-4xl",
        className
      )}
    >
      Settle
    </span>
  );
}
