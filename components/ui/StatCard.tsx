import type { HTMLAttributes } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardColor = "blue" | "green" | "gold" | "red" | "orange";

type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  color?: StatCardColor;
  change?: {
    value: string;
    direction: "up" | "down";
  };
};

const borderColors: Record<StatCardColor, string> = {
  blue: "border-t-blue-primary",
  green: "border-t-green",
  gold: "border-t-gold",
  red: "border-t-red-600",
  orange: "border-t-orange-600",
};

export function StatCard({
  label,
  value,
  color = "blue",
  change,
  className,
  ...props
}: StatCardProps) {
  const isPositive = change?.direction === "up";

  return (
    <div
      className={cn(
        "rounded-xl border border-t-4 border-blue-border bg-white p-5 shadow-sm shadow-blue-dark/5",
        borderColors[color],
        className,
      )}
      {...props}
    >
      <p className="text-sm font-medium text-ink2">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold leading-none text-ink">
          {value}
        </p>
        {change ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs font-semibold",
              isPositive
                ? "bg-green-light text-green"
                : "bg-red-50 text-red-700",
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {change.value}
          </span>
        ) : null}
      </div>
    </div>
  );
}
