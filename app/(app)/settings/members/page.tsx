import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  type Invite,
  type Member,
  MemberManager,
  type StoreOpt,
} from "@/components/settings/member-manager";
import { getActiveOrgId, getMyRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function MembersSettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: { user } }, { data: members }, { data: invites }, { data: stores }, myRole] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("list_members", { p_org: orgId }),
      supabase.rpc("list_org_invites", { p_org: orgId }),
      supabase.from("stores").select("id, name").eq("org_id", orgId).order("created_at"),
      getMyRole(orgId),
    ]);

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Mời nhân viên qua email, gán chi nhánh và phân quyền."
      />
      <MemberManager
        members={(members as Member[]) ?? []}
        invites={(invites as Invite[]) ?? []}
        stores={(stores as StoreOpt[] | null) ?? []}
        myRole={myRole}
        myUserId={user?.id ?? ""}
      />
    </>
  );
}
