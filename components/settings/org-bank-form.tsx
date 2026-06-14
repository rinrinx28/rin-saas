"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateOrgBankAction } from "@/app/(app)/settings/actions";
import { BankSelect } from "@/components/payment/bank-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findBank } from "@/lib/payment/vn-banks";
import { type BankInput, bankSchema } from "@/lib/validations/settings";

export interface OrgBankValues {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

export function OrgBankForm({ values }: { values: OrgBankValues }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Bản sao cục bộ để xem trước (không dùng watch — giữ lint sạch).
  const [bankName, setBankName] = useState(values.bankName);
  const [account, setAccount] = useState(values.bankAccount);
  const [holder, setHolder] = useState(values.bankHolder);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BankInput>({ resolver: zodResolver(bankSchema), values });

  const bank = findBank(bankName);

  async function onSubmit(v: BankInput) {
    setServerError(null);
    setSaved(false);
    const res = await updateOrgBankAction(v);
    if (res?.error) setServerError(res.error);
    else setSaved(true);
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <p className="text-sm text-fg-muted">
              Chọn ngân hàng và nhập số tài khoản để sinh mã QR chuyển khoản cho khách. Chi
              nhánh có thể đặt tài khoản riêng (ghi đè) ở mục Chi nhánh.
            </p>
            {serverError && (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
                {serverError}
              </p>
            )}
            {saved && (
              <p role="status" className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
                Đã lưu tài khoản nhận tiền.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bankName">Ngân hàng</Label>
              <BankSelect
                id="bankName"
                value={bankName}
                onChange={(v) => {
                  setBankName(v);
                  setValue("bankName", v, { shouldDirty: true });
                }}
              />
            </div>
            <Field label="Số tài khoản" htmlFor="bankAccount" error={errors.bankAccount?.message}>
              <Input
                id="bankAccount"
                inputMode="numeric"
                placeholder="0123456789"
                {...register("bankAccount", { onChange: (e) => setAccount(e.target.value) })}
              />
            </Field>
            <Field label="Chủ tài khoản" htmlFor="bankHolder">
              <Input
                id="bankHolder"
                placeholder="NGUYEN VAN A"
                {...register("bankHolder", { onChange: (e) => setHolder(e.target.value) })}
              />
            </Field>
            <Button type="submit" loading={isSubmitting}>Lưu tài khoản</Button>
          </form>

          <BankPreview bank={bank} account={account} holder={holder} />
        </div>
      </CardContent>
    </Card>
  );
}

function BankPreview({
  bank,
  account,
  holder,
}: {
  bank: ReturnType<typeof findBank>;
  account: string;
  holder: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Xem trước</p>
      {bank ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bank.logo} alt={bank.shortName} width={44} height={44} className="size-11 rounded-lg border border-border bg-surface object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate font-medium">{bank.shortName}</p>
            <p className="truncate text-xs text-fg-muted">{bank.name}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-fg-subtle">
          <div className="flex size-11 items-center justify-center rounded-lg border border-dashed border-border">
            <Landmark className="size-5" />
          </div>
          <p className="text-sm">Chưa chọn ngân hàng</p>
        </div>
      )}
      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-fg-muted">Số TK</span>
          <span className="tnum truncate">{account || "—"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-fg-muted">Chủ TK</span>
          <span className="truncate">{holder || "—"}</span>
        </div>
      </div>
    </div>
  );
}
