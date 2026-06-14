"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { updatePlanAction } from "@/app/(app)/settings/billing/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LIMIT_LABEL,
  type LimitKind,
  PLAN_ORDER,
  PLANS,
  type PlanKey,
} from "@/lib/plans";
import { cn, formatVnd } from "@/lib/utils";

export interface Usage {
  products: { used: number; limit: number | null };
  stores: { used: number; limit: number | null };
  members: { used: number; limit: number | null };
}

const KINDS: LimitKind[] = ["products", "stores", "members"];

export function BillingView({
  currentPlan,
  usage,
  canManage,
}: {
  currentPlan: PlanKey;
  usage: Usage;
  canManage: boolean;
}) {
  const [pending, setPending] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: PlanKey) {
    if (plan === currentPlan) return;
    setPending(plan);
    setError(null);
    const res = await updatePlanAction(plan);
    setPending(null);
    if (res?.error) setError(res.error);
  }

  return (
    <div className="space-y-6">
      {/* Mức sử dụng */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-fg-muted">Gói hiện tại:</span>
            <Badge variant="primary">{PLANS[currentPlan].name}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {KINDS.map((k) => {
              const u = usage[k];
              const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
              const full = u.limit !== null && u.used >= u.limit;
              return (
                <div key={k} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-fg-muted">{LIMIT_LABEL[k]}</span>
                    <span className="tnum">
                      {u.used}
                      {u.limit === null ? " / ∞" : ` / ${u.limit}`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    {u.limit !== null && (
                      <div
                        className={cn("h-full rounded-full", full ? "bg-danger" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Bảng giá */}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isCurrent = key === currentPlan;
          return (
            <Card key={key} className={cn(isCurrent && "ring-2 ring-primary")}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  {isCurrent && <Badge variant="primary">Đang dùng</Badge>}
                </div>
                <p className="mt-2">
                  <span className="tnum text-2xl font-semibold">{formatVnd(plan.price)}</span>
                  <span className="text-sm text-fg-muted"> / tháng</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {KINDS.map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <Check className="size-4 text-success" />
                      {plan.limits[k] === null ? "Không giới hạn" : plan.limits[k]} {LIMIT_LABEL[k]}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={isCurrent ? "outline" : "primary"}
                  disabled={isCurrent || !canManage}
                  loading={pending === key}
                  onClick={() => choose(key)}
                >
                  {isCurrent ? "Gói hiện tại" : "Chọn gói"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-fg-subtle">
        * Demo cho phép đổi gói ngay. Thanh toán thật (VNPay / MoMo / SePay) sẽ tích hợp sau.
      </p>
    </div>
  );
}
