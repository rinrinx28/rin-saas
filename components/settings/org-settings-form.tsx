"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateOrgAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type OrgInput, orgSchema } from "@/lib/validations/settings";

export function OrgSettingsForm({ name }: { name: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgInput>({ resolver: zodResolver(orgSchema), values: { name } });

  async function onSubmit(values: OrgInput) {
    setServerError(null);
    setSaved(false);
    const res = await updateOrgAction(values);
    if (res?.error) setServerError(res.error);
    else setSaved(true);
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          {saved && (
            <p role="status" className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
              Đã lưu thay đổi.
            </p>
          )}
          <Field label="Tên cửa hàng" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Button type="submit" loading={isSubmitting}>Lưu</Button>
        </form>
      </CardContent>
    </Card>
  );
}
