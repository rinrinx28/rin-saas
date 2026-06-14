"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPaymentRequestAction,
  downgradeToFreeAction,
  simulatePaymentAction,
} from "@/app/(app)/settings/billing/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export interface BankInfo {
  name: string;
  account: string;
  holder: string;
}

interface PaymentState {
  plan: PlanKey;
  memo: string;
  amount: number;
}

const KINDS: LimitKind[] = ["products", "stores", "members"];

export function BillingView({
  currentPlan,
  usage,
  canManage,
  bank,
  simulateEnabled,
  expiresAt,
}: {
  currentPlan: PlanKey;
  usage: Usage;
  canManage: boolean;
  bank: BankInfo;
  simulateEnabled: boolean;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentState | null>(null);

  async function choose(plan: PlanKey) {
    if (plan === currentPlan) return;
    setError(null);
    setPending(plan);
    if (plan === "free") {
      const res = await downgradeToFreeAction();
      setPending(null);
      if (res?.error) setError(res.error);
      else router.refresh();
      return;
    }
    const res = await createPaymentRequestAction(plan);
    setPending(null);
    if (res?.error) setError(res.error);
    else if (res.memo && res.amount != null) {
      setPayment({ plan, memo: res.memo, amount: res.amount });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-fg-muted">Gói hiện tại:</span>
            <Badge variant="primary">{PLANS[currentPlan].name}</Badge>
            {currentPlan !== "free" && expiresAt && (
              <span className="text-sm text-fg-muted">
                · hết hạn {new Date(expiresAt).toLocaleDateString("vi-VN")}
              </span>
            )}
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
                  variant={isCurrent ? "outline" : key === "free" ? "secondary" : "primary"}
                  disabled={isCurrent || !canManage}
                  loading={pending === key}
                  onClick={() => choose(key)}
                >
                  {isCurrent ? "Gói hiện tại" : key === "free" ? "Hạ về Miễn phí" : "Nâng cấp"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PaymentDialog
        payment={payment}
        bank={bank}
        simulateEnabled={simulateEnabled}
        onClose={() => setPayment(null)}
        onPaid={() => {
          setPayment(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function PaymentDialog({
  payment,
  bank,
  simulateEnabled,
  onClose,
  onPaid,
}: {
  payment: PaymentState | null;
  bank: BankInfo;
  simulateEnabled: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulate() {
    if (!payment) return;
    setLoading(true);
    setError(null);
    const res = await simulatePaymentAction(payment.memo);
    setLoading(false);
    if (res?.error) setError(res.error);
    else onPaid();
  }

  // Nội dung chuyển khoản (chứa memo để webhook đối soát) — dùng chung cho QR & hiển thị.
  const desc = payment ? `Thanh toan goi ${payment.memo}` : "";
  // QR của SePay — sinh đúng cho tài khoản đã kết nối SePay.
  const qrUrl =
    payment && bank.account
      ? `https://qr.sepay.vn/img?${new URLSearchParams({
          bank: bank.name,
          acc: bank.account,
          amount: String(payment.amount),
          des: desc,
          template: "compact",
        }).toString()}`
      : null;

  return (
    <Dialog open={payment !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển khoản nâng cấp {payment ? PLANS[payment.plan].name : ""}</DialogTitle>
          <DialogDescription>
            Quét QR hoặc chuyển khoản đúng nội dung. Gói tự kích hoạt sau khi nhận tiền.
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-3">
            {qrUrl && (
              <div className="flex justify-center">
                <Image src={qrUrl} alt="VietQR" width={200} height={200} className="rounded-lg border border-border" unoptimized />
              </div>
            )}
            <div className="space-y-1.5 rounded-md border border-border bg-surface-2 p-3 text-sm">
              <Row label="Ngân hàng" value={bank.name || "(cấu hình NEXT_PUBLIC_BANK_*)"} />
              <Row label="Số tài khoản" value={bank.account || "—"} mono />
              {bank.holder && <Row label="Chủ tài khoản" value={bank.holder} />}
              <Row label="Số tiền" value={formatVnd(payment.amount)} mono />
              <Row label="Nội dung CK" value={desc} highlight />
            </div>
            <p className="text-xs text-fg-subtle">
              ⚠️ Chuyển khoản đúng nội dung “{desc}” để hệ thống tự đối soát.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Đóng</Button>
          {simulateEnabled && (
            <Button loading={loading} onClick={simulate}>
              Tôi đã chuyển khoản (giả lập)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-muted">{label}</span>
      <span className={cn(mono && "tnum", highlight && "font-semibold text-primary")}>{value}</span>
    </div>
  );
}
