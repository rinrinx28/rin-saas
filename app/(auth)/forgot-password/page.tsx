"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type ForgotPasswordInput, forgotPasswordSchema } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    setNotice(null);
    const res = await requestPasswordResetAction(values);
    if (res?.error) setServerError(res.error);
    else if (res?.notice) setNotice(res.notice);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Quên mật khẩu</h1>
        <p className="text-sm text-fg-muted">
          Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {serverError}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-sm text-success"
          >
            {notice}
          </p>
        )}

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ban@cuahang.vn"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Gửi liên kết đặt lại
        </Button>
      </form>

      <p className="text-center text-sm text-fg-muted">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
