import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { StoreManager } from "@/components/settings/store-manager";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function StoresSettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, address")
    .eq("org_id", orgId)
    .order("created_at");

  return (
    <>
      <PageHeader title="Chi nhánh" description="Quản lý các chi nhánh của cửa hàng." />
      <StoreManager stores={stores ?? []} />
    </>
  );
}
