"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateOrgBankAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type BankInput, bankSchema } from "@/lib/validations/settings";

export interface OrgBankValues {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
}

export function OrgBankForm({ values }: { values: OrgBankValues }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BankInput>({ resolver: zodResolver(bankSchema), values });

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
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
          <p className="text-sm text-fg-muted">
            Tài khoản nhận tiền dùng để sinh mã QR chuyển khoản cho khách. Chi nhánh có
            thể đặt tài khoản riêng (ghi đè) ở mục Chi nhánh.
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
          <Field label="Ngân hàng" htmlFor="bankName" error={errors.bankName?.message}>
            <Input id="bankName" placeholder="Vietcombank" {...register("bankName")} />
          </Field>
          <Field label="Số tài khoản" htmlFor="bankAccount" error={errors.bankAccount?.message}>
            <Input id="bankAccount" inputMode="numeric" placeholder="0123456789" {...register("bankAccount")} />
          </Field>
          <Field label="Chủ tài khoản" htmlFor="bankHolder" error={errors.bankHolder?.message}>
            <Input id="bankHolder" placeholder="NGUYEN VAN A" {...register("bankHolder")} />
          </Field>
          <Button type="submit" loading={isSubmitting}>Lưu tài khoản</Button>
        </form>
      </CardContent>
    </Card>
  );
}
