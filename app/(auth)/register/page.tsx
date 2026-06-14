"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type RegisterInput, registerSchema } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit() {
    // TODO(P1 backend): Supabase signUp → gửi tới onboarding tạo org đầu tiên.
    await new Promise((r) => setTimeout(r, 600));
    router.push("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Tạo tài khoản
        </h1>
        <p className="text-sm text-fg-muted">
          Bắt đầu quản lý cửa hàng của bạn miễn phí.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Họ và tên" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
        </Field>

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

        <Field label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>

        <Field
          label="Nhập lại mật khẩu"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </Field>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Tạo tài khoản
        </Button>
      </form>

      <p className="text-center text-sm text-fg-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
