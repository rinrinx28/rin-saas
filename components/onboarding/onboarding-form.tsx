"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createOrganizationAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type OnboardingInput, onboardingSchema } from "@/lib/validations/auth";

export function OnboardingForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema) });

  async function onSubmit(values: OnboardingInput) {
    setServerError(null);
    const res = await createOrganizationAction(values);
    if (res?.error) setServerError(res.error);
    // Thành công → server action redirect sang /dashboard
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thiết lập cửa hàng</CardTitle>
        <CardDescription>Tạo cửa hàng và chi nhánh đầu tiên để bắt đầu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Field label="Tên cửa hàng" htmlFor="orgName" error={errors.orgName?.message}>
            <Input id="orgName" placeholder="Cửa hàng Thời trang ABC" aria-invalid={!!errors.orgName} {...register("orgName")} />
          </Field>
          <Field label="Tên chi nhánh đầu tiên" htmlFor="storeName" error={errors.storeName?.message}>
            <Input id="storeName" placeholder="Chi nhánh Quận 1" aria-invalid={!!errors.storeName} {...register("storeName")} />
          </Field>
          <Field label="Địa chỉ chi nhánh (tùy chọn)" htmlFor="storeAddress" error={errors.storeAddress?.message}>
            <Input id="storeAddress" placeholder="123 Lê Lợi, Quận 1, TP.HCM" {...register("storeAddress")} />
          </Field>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Hoàn tất &amp; vào quản lý
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
