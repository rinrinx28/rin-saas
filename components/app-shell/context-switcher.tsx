"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCookie, setCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";

interface SwitcherOption {
  id: string;
  name: string;
}

interface ContextSwitcherProps {
  label: string;
  options: SwitcherOption[];
  activeId?: string;
  cookieName: string;
  /** Cookie cần xóa khi đổi (vd đổi org → reset chi nhánh) */
  alsoClear?: string[];
  /** Đổi context bằng điều hướng URL thay vì cookie. Mẫu chứa ":id"
   *  (vd "/s/:id/dashboard"). Là chuỗi để truyền được từ Server Component. */
  navPattern?: string;
  className?: string;
}

export function ContextSwitcher({
  label,
  options,
  activeId,
  cookieName,
  alsoClear,
  navPattern,
  className,
}: ContextSwitcherProps) {
  const router = useRouter();
  if (options.length === 0) return null;

  const active = options.find((o) => o.id === activeId) ?? options[0];

  function select(id: string) {
    if (id === active.id) return;
    alsoClear?.forEach(deleteCookie);
    // Đổi cửa hàng → điều hướng URL (middleware tự set active_org từ URL).
    if (navPattern) {
      router.push(navPattern.replace(":id", id));
      return;
    }
    setCookie(cookieName, id);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 max-w-48 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm transition-colors hover:bg-surface",
          className,
        )}
      >
        <span className="truncate font-medium">{active.name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => select(o.id)}>
            <span className="flex-1 truncate">{o.name}</span>
            {o.id === active.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
