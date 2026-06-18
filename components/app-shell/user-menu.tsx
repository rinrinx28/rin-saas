"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgPath } from "@/lib/use-org-path";
import { initials } from "@/lib/utils";

interface UserMenuProps {
  name: string;
  email: string;
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const orgPath = useOrgPath();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-full bg-primary-bg text-sm font-semibold text-primary transition-colors hover:opacity-90"
        aria-label="Menu người dùng"
      >
        {initials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="normal-case">
          <span className="block text-sm font-medium text-fg">{name}</span>
          <span className="block text-xs font-normal text-fg-muted">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Tài khoản → hub cá nhân (rời workspace cửa hàng). ADR 0015. */}
        <DropdownMenuItem onSelect={() => router.push("/app/account")}>
          <UserRound /> Tài khoản
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(orgPath("/settings"))}>
          <Settings /> Cài đặt cửa hàng
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:bg-danger-bg"
          onSelect={() => signOutAction()}
        >
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
