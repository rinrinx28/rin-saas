import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { BillingView, type Usage } from "@/components/settings/billing-view";
import { getActiveOrgId, getMyRole, getOrgPlan } from "@/lib/org";
import { getUsage } from "@/lib/limits";
import type { PlanKey } from "@/lib/plans";

export default async function BillingPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const [plan, role, products, stores, members] = await Promise.all([
    getOrgPlan(orgId),
    getMyRole(orgId),
    getUsage(orgId, "products"),
    getUsage(orgId, "stores"),
    getUsage(orgId, "members"),
  ]);

  const usage: Usage = { products, stores, members };

  return (
    <>
      <PageHeader title="Gói cước" description="Gói hiện tại, mức sử dụng và nâng cấp." />
      <BillingView
        currentPlan={plan as PlanKey}
        usage={usage}
        canManage={role === "owner" || role === "admin"}
      />
    </>
  );
}
