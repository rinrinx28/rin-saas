"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, mockUser } from "@/lib/mock-data";

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-full bg-primary-bg text-sm font-semibold text-primary transition-colors hover:opacity-90"
        aria-label="Menu người dùng"
      >
        {initials(mockUser.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="normal-case">
          <span className="block text-sm font-medium text-fg">{mockUser.name}</span>
          <span className="block text-xs font-normal text-fg-muted">
            {mockUser.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound /> Tài khoản
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings /> Cài đặt
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger focus:bg-danger-bg">
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
