import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Soft-filled — ADR 0004: nền surface-2, viền mảnh, focus lên surface + ring
export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 py-1 text-base text-fg shadow-sm transition-colors duration-150",
        "placeholder:text-fg-subtle",
        "hover:bg-surface",
        "focus-visible:border-primary focus-visible:bg-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}
