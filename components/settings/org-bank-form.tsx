"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateOrgBankAction } from "@/app/(app)/settings/actions";
import { BankIcon } from "@/components/payment/bank-icon";
import { BankSelect } from "@/components/payment/bank-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { findBank } from "@/lib/payment/vn-banks";
import { type BankInput, bankSchema } from "@/lib/validations/settings";

export interface OrgBankValues {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

export function OrgBankForm({ values }: { values: OrgBankValues }) {
  const toast = useToast();
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
    const res = await updateOrgBankAction(v);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã lưu tài khoản nhận tiền");
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-6 md:grid-cols-[1fr_360px]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <p className="text-sm text-fg-muted">
              Chọn ngân hàng và nhập số tài khoản để tạo mã QR thu tiền cho khách. Mỗi chi
              nhánh có thể dùng tài khoản riêng (ghi đè) trong mục Chi nhánh.
            </p>

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
          <BankIcon bank={bank} size="lg" />
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

      {/* QR VietQR mẫu — quét thử để kiểm tra ra đúng ngân hàng/tài khoản. */}
      {bank && account.trim() && (
        <div className="flex flex-col items-center gap-2 border-t border-border pt-3">
          <p className="text-xs text-fg-muted">QR mẫu — quét thử bằng app ngân hàng</p>
          <Image
            src={`https://img.vietqr.io/image/${bank.bin}-${account.trim()}-qr_only.png${
              holder.trim() ? `?accountName=${encodeURIComponent(holder.trim())}` : ""
            }`}
            alt="QR VietQR mẫu"
            width={180}
            height={180}
            unoptimized
            className="rounded-lg border border-border bg-white p-1.5"
          />
        </div>
      )}
    </div>
  );
}
