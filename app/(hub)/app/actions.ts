"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
  notice?: string;
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên hiển thị").max(80),
});

// Đổi tên hiển thị (user_metadata.full_name).
export async function updateProfileAction(values: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { error: "Tên hiển thị không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.name },
  });
  if (error) return { error: "Không cập nhật được tên hiển thị" };

  revalidatePath("/app/account");
  revalidatePath("/", "layout");
  return { notice: "Đã cập nhật tên hiển thị." };
}

const passwordSchema = z.object({
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
});

// Đổi mật khẩu đăng nhập.
export async function updatePasswordAction(values: unknown): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(values);
  if (!parsed.success) return { error: "Mật khẩu tối thiểu 6 ký tự" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Không đổi được mật khẩu. Vui lòng thử lại." };

  return { notice: "Đã đổi mật khẩu." };
}
