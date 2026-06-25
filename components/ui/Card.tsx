import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-blue-border bg-white p-5 shadow-sm shadow-blue-dark/5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
