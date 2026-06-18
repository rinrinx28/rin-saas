"use client";

import { Mail, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  href: string;
  label: string;
  icon: typeof Store;
  exact?: boolean;
}

const TABS: Tab[] = [
  { href: "/app", label: "Cửa hàng", icon: Store, exact: true },
  { href: "/app/invites", label: "Lời mời", icon: Mail },
  { href: "/app/account", label: "Tài khoản", icon: UserRound },
];

export function HubNav({ inviteCount }: { inviteCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border" aria-label="Điều hướng hub">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
            {t.href === "/app/invites" && inviteCount > 0 && (
              <span className="tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {inviteCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
