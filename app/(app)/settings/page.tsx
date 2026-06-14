import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  return (
    <>
      <PageHeader title="Cửa hàng" description="Thông tin tổ chức." />
      <OrgSettingsForm name={org?.name ?? ""} />
    </>
  );
}
