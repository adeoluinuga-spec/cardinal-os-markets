import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "green" | "blue" | "orange" | "red" | "gold";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const variants: Record<BadgeVariant, string> = {
  green: "bg-green-light text-green",
  blue: "bg-blue-light text-blue-primary",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
  gold: "bg-yellow-50 text-gold",
};

export function Badge({
  variant = "blue",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
