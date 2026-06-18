import { redirect } from "next/navigation";
import { UserMenu } from "@/components/app-shell/user-menu";
import { HubNav } from "@/components/hub/hub-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/server";

// Hub cá nhân (cấp tài khoản) — ADR 0015. Không gắn cửa hàng nào.
export default async function HubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invitesData } = await supabase.rpc("list_invites_for_me");
  const inviteCount = (invitesData as unknown[] | null)?.length ?? 0;

  const userName =
    (user.user_metadata?.full_name as string | undefined) || user.email || "Người dùng";

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
        <Logo className="text-fg" />
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu name={userName} email={user.email ?? ""} />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <HubNav inviteCount={inviteCount} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
