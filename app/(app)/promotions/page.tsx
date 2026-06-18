import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PromotionManager, type Promotion } from "@/components/promotions/promotion-manager";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function PromotionsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const canManage = await isManager(orgId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("promotions")
    .select("id, name, code, type, value, min_order, max_discount, starts_at, ends_at, active")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Khuyến mãi"
        description="Chương trình giảm giá mức đơn — tự áp cho mọi đơn hoặc theo mã coupon."
      />
      <PromotionManager promotions={(data as Promotion[] | null) ?? []} canManage={canManage} />
    </>
  );
}
