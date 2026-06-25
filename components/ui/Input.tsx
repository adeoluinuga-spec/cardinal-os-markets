import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-lg border border-blue-border bg-blue-pale px-3 text-sm text-ink outline-none transition placeholder:text-ink3 focus:border-blue-primary focus:bg-white focus:ring-2 focus:ring-blue-light disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
