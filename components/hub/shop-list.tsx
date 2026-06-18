"use client";

import { ArrowRight, Loader2, Mail, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ACTIVE_STORE_COOKIE } from "@/lib/constants";
import { deleteCookie } from "@/lib/cookies";
import { ROLE_LABEL } from "@/lib/roles";

export interface ShopVM {
  id: string;
  name: string;
  role: string;
  plan: string;
  planName: string;
  branches: number;
}

// Tông badge gói: free trung tính, pro thông tin, doanh nghiệp nhấn mạnh.
const PLAN_TONE: Record<string, "neutral" | "info" | "primary"> = {
  free: "neutral",
  pro: "info",
  business: "primary",
};

function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function ShopList({ shops }: { shops: ShopVM[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // Vào cửa hàng: điều hướng URL-scope; middleware tự set active_org từ URL.
  function enter(id: string) {
    setBusy(id);
    deleteCookie(ACTIVE_STORE_COOKIE);
    router.push(`/s/${id}/dashboard`);
  }

  if (shops.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-bg text-primary ring-1 ring-inset ring-primary/15">
          <Store className="size-7" />
        </span>
        <h2 className="font-display text-xl font-semibold tracking-tight">Bắt đầu cửa hàng đầu tiên</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted">
          Tạo cửa hàng của riêng bạn, hoặc xem các lời mời đang chờ để tham gia cùng đội nhóm.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild>
            <Link href="/app/new">
              <Plus /> Tạo cửa hàng
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/invites">
              <Mail /> Xem lời mời
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {shops.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => enter(s.id)}
            disabled={busy !== null}
            aria-label={`Vào ${s.name}`}
            className="group flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-bg font-display text-xl font-semibold text-primary ring-1 ring-inset ring-primary/15">
              {monogram(s.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium text-fg">{s.name}</span>
                <Badge variant={PLAN_TONE[s.plan] ?? "neutral"}>{s.planName}</Badge>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
                <Store className="size-3.5 shrink-0" />
                {s.branches} chi nhánh · {ROLE_LABEL[s.role] ?? s.role}
              </span>
            </span>
            {busy === s.id ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            ) : (
              <ArrowRight className="size-5 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
