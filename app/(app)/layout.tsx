import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MyInvite } from "@/app/(app)/invites/actions";
import { InvitePrompt } from "@/components/app-shell/invite-prompt";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import {
  ACTIVE_ORG_COOKIE,
  ACTIVE_STORE_COOKIE,
  SIDEBAR_COOKIE,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

// App shell — ADR 0005. Query org/chi nhánh/user thật theo session + RLS.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Org của user (RLS chỉ trả org mà user là thành viên)
  const [{ data: orgs }, { data: invitesData }] = await Promise.all([
    supabase.from("organizations").select("id, name").order("created_at"),
    supabase.rpc("list_invites_for_me"),
  ]);
  const invites = (invitesData as MyInvite[] | null) ?? [];

  // Chưa thuộc cửa hàng nào: nếu có lời mời thì hiện để đồng ý/từ chối,
  // không thì sang onboarding tạo cửa hàng.
  if (!orgs || orgs.length === 0) {
    if (invites.length === 0) redirect("/onboarding");
    return (
      <div className="min-h-dvh bg-bg px-4 py-16">
        <div className="mx-auto max-w-md">
          <h1 className="mb-1 font-display text-2xl font-semibold tracking-tight">Lời mời tham gia</h1>
          <p className="mb-6 text-sm text-fg-muted">
            Bạn được mời vào cửa hàng dưới đây. Hoặc{" "}
            <Link href="/onboarding" className="text-primary hover:underline">
              tạo cửa hàng mới
            </Link>
            .
          </p>
          <InvitePrompt invites={invites} />
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const activeOrg =
    orgs.find((o) => o.id === cookieStore.get(ACTIVE_ORG_COOKIE)?.value) ?? orgs[0];

  // Chi nhánh của org đang active
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name")
    .eq("org_id", activeOrg.id)
    .order("created_at");
  const activeStore =
    stores?.find((s) => s.id === cookieStore.get(ACTIVE_STORE_COOKIE)?.value) ??
    stores?.[0];

  const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";
  const userName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "Người dùng";

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar defaultCollapsed={defaultCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          orgs={orgs}
          stores={stores ?? []}
          activeOrgId={activeOrg.id}
          activeStoreId={activeStore?.id}
          userName={userName}
          userEmail={user.email ?? ""}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <InvitePrompt invites={invites} />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
