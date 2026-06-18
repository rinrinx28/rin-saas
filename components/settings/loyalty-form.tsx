"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateLoyaltyAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import type { LoyaltyConfig } from "@/lib/validations/loyalty";
import { formatVnd } from "@/lib/utils";

export function LoyaltyForm({ values }: { values: LoyaltyConfig }) {
  const router = useRouter();
  const toast = useToast();
  const [enabled, setEnabled] = useState(values.enabled);
  const [earnPerK, setEarnPerK] = useState(values.earnPerK);
  const [redeemValue, setRedeemValue] = useState(values.redeemValue);
  const [minRedeem, setMinRedeem] = useState(values.minRedeem);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await updateLoyaltyAction({ enabled, earnPerK, redeemValue, minRedeem });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã lưu cấu hình tích điểm");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="font-medium">Bật tích điểm khách hàng</span>
        </label>

        <div className={enabled ? "grid gap-4 sm:grid-cols-3" : "hidden"}>
          <Field label="Điểm cộng / 1.000đ" htmlFor="earn">
            <Input
              id="earn"
              inputMode="numeric"
              className="tnum"
              value={earnPerK || ""}
              onChange={(e) => setEarnPerK(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </Field>
          <Field label="1 điểm đổi được (đ)" htmlFor="redeem">
            <MoneyInput id="redeem" value={redeemValue} onChange={setRedeemValue} />
          </Field>
          <Field label="Điểm tối thiểu/lần đổi" htmlFor="minredeem">
            <Input
              id="minredeem"
              inputMode="numeric"
              className="tnum"
              value={minRedeem || ""}
              onChange={(e) => setMinRedeem(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </Field>
        </div>

        {enabled && (
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
            Ví dụ: khách mua <span className="tnum">{formatVnd(100000)}</span> → cộng{" "}
            <span className="tnum font-medium text-fg">{Math.floor(100000 / 1000) * earnPerK}</span> điểm.
            Đổi 100 điểm = <span className="tnum font-medium text-fg">{formatVnd(100 * redeemValue)}</span>.
          </p>
        )}

        <Button onClick={submit} loading={submitting}>
          Lưu cấu hình
        </Button>
      </CardContent>
    </Card>
  );
}
