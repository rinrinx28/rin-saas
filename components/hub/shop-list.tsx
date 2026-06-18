"use client";

import { ArrowRight, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ACTIVE_ORG_COOKIE, ACTIVE_STORE_COOKIE } from "@/lib/constants";
import { deleteCookie, setCookie } from "@/lib/cookies";
import { ROLE_LABEL, roleBadge } from "@/lib/roles";
import { cn } from "@/lib/utils";

export interface ShopVM {
  id: string;
  name: string;
  role: string;
  planName: string;
  branches: number;
}

export function ShopList({ shops }: { shops: ShopVM[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  // Vào cửa hàng: set org đang active (Pha A — cookie) rồi mở workspace.
  // Pha B sẽ đổi sang điều hướng /s/[orgId]/dashboard.
  function enter(id: string) {
    setBusy(id);
    setCookie(ACTIVE_ORG_COOKIE, id);
    deleteCookie(ACTIVE_STORE_COOKIE);
    router.push("/dashboard");
  }

  if (shops.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          <Store className="size-6" />
        </span>
        <div>
          <p className="font-medium">Bạn chưa tham gia cửa hàng nào</p>
          <p className="text-sm text-fg-muted">
            Tạo cửa hàng của riêng bạn, hoặc kiểm tra{" "}
            <Link href="/app/invites" className="text-primary hover:underline">
              lời mời
            </Link>{" "}
            đang chờ.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/new">
            <Plus /> Tạo cửa hàng
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {shops.map((s) => (
        <Card key={s.id} className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-bg text-primary">
                <Store className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-sm text-fg-muted">
                  {s.branches} chi nhánh · {s.planName}
                </p>
              </div>
            </div>
            <Badge variant={roleBadge(s.role)}>{ROLE_LABEL[s.role] ?? s.role}</Badge>
          </div>
          <Button
            variant="outline"
            className={cn("w-full justify-between")}
            loading={busy === s.id}
            onClick={() => enter(s.id)}
          >
            Vào quản lý
            <ArrowRight className="size-4" />
          </Button>
        </Card>
      ))}
    </div>
  );
}
