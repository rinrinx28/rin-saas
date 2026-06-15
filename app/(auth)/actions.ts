"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, registerSchema } from "@/lib/validations/auth";

export interface ActionResult {
  error?: string;
  notice?: string;
}

export async function signInAction(values: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Email hoặc mật khẩu không đúng" };

  redirect("/dashboard");
}

export async function signUpAction(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.name } },
  });
  if (error) return { error: error.message };

  // Nếu bật xác nhận email → chưa có session
  if (!data.session) {
    return {
      notice: "Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư rồi đăng nhập.",
    };
  }

  redirect("/onboarding");
}

// Luôn trả notice chung dù email có tồn tại hay không (tránh dò tài khoản).
const RESET_NOTICE =
  "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.";

export async function requestPasswordResetAction(values: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: "Email không hợp lệ" };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  });

  return { notice: RESET_NOTICE };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
