import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Bảng dữ liệu — ADR 0004: ruled + hover, compact, header sticky.
// Bọc trong container set data-density="compact" để dùng --row-h/--cell-*.
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div data-density="compact" className="relative w-full overflow-auto">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("sticky top-0 z-10 bg-surface", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors duration-150 hover:bg-surface-2 data-[state=selected]:bg-primary-bg",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 border-b border-border-strong px-(--cell-px) text-left align-middle text-xs font-medium uppercase tracking-wider text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("h-(--row-h) px-(--cell-px) py-(--cell-py) align-middle", className)}
      {...props}
    />
  );
}
