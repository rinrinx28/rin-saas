"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SwitcherOption {
  id: string;
  name: string;
}

interface ContextSwitcherProps {
  label: string;
  options: SwitcherOption[];
  className?: string;
}

// TẠM: chọn cục bộ bằng state. Sẽ thay bằng set cookie active org/store ở backend.
export function ContextSwitcher({ label, options, className }: ContextSwitcherProps) {
  const [activeId, setActiveId] = useState(options[0]?.id);
  const active = options.find((o) => o.id === activeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 max-w-[12rem] items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm transition-colors hover:bg-surface",
          className,
        )}
      >
        <span className="truncate font-medium">{active?.name ?? label}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => setActiveId(o.id)}>
            <span className="flex-1 truncate">{o.name}</span>
            {o.id === activeId && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
