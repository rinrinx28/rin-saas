import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { MemberManager, type Member } from "@/components/settings/member-manager";
import { getActiveOrgId, getMyRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function MembersSettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: { user } }, { data: members }, myRole] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("list_members", { p_org: orgId }),
    getMyRole(orgId),
  ]);

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Thành viên và phân quyền (owner / admin / staff)."
      />
      <MemberManager
        members={(members as Member[]) ?? []}
        myRole={myRole}
        myUserId={user?.id ?? ""}
      />
    </>
  );
}
