import { redirect } from "next/navigation";
import { AccountForm } from "@/components/hub/account-form";
import { createClient } from "@/lib/supabase/server";

// Hub → Quản lý tài khoản (hồ sơ cá nhân, không gắn cửa hàng). ADR 0015.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Tài khoản</h1>
        <p className="text-sm text-fg-muted">Quản lý hồ sơ cá nhân và mật khẩu đăng nhập.</p>
      </div>
      <AccountForm name={name} email={user.email ?? ""} />
    </div>
  );
}
