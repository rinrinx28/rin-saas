"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { type ResetPasswordInput, resetPasswordSchema } from "@/lib/validations/auth";

type Status = "verifying" | "ready" | "invalid" | "done";

const VERIFY_TIMEOUT_MS = 4000;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  // Bắt phiên khôi phục: createBrowserClient tự đọc token từ URL (hash/code)
  // và phát sự kiện PASSWORD_RECOVERY. Quá thời gian mà không có phiên → link hỏng.
  useEffect(() => {
    const supabase = createClient();
    let resolved = false;
    const ready = () => {
      resolved = true;
      setStatus("ready");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) ready();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) ready();
    });
    const t = setTimeout(() => {
      if (!resolved) setStatus("invalid");
    }, VERIFY_TIMEOUT_MS);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError("Không đặt lại được mật khẩu. Liên kết có thể đã hết hạn — hãy thử lại.");
      return;
    }
    setStatus("done");
    router.replace("/dashboard");
  }

  if (status === "verifying") {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-fg-muted">Đang xác thực liên kết…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Liên kết không hợp lệ</h1>
          <p className="text-sm text-fg-muted">
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu liên kết mới.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
        </Button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="space-y-3 text-center">
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-sm text-success"
        >
          Đặt lại mật khẩu thành công. Đang chuyển hướng…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Đặt mật khẩu mới</h1>
        <p className="text-sm text-fg-muted">Nhập mật khẩu mới cho tài khoản của bạn.</p>
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

        <Field label="Mật khẩu mới" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
              aria-invalid={!!errors.password}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <Field
          label="Nhập lại mật khẩu"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </Field>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Cập nhật mật khẩu
        </Button>
      </form>
    </div>
  );
}
