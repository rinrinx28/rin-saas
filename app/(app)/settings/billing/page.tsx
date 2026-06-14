import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { BillingView, type Usage } from "@/components/settings/billing-view";
import { getActiveOrgId, getMyRole, getOrgPlan } from "@/lib/org";
import { getUsage } from "@/lib/limits";
import type { PlanKey } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const [plan, role, products, stores, members, { data: org }] = await Promise.all([
    getOrgPlan(orgId),
    getMyRole(orgId),
    getUsage(orgId, "products"),
    getUsage(orgId, "stores"),
    getUsage(orgId, "members"),
    supabase.from("organizations").select("plan_expires_at").eq("id", orgId).single(),
  ]);

  const usage: Usage = { products, stores, members };

  return (
    <>
      <PageHeader title="Gói cước" description="Gói dịch vụ hiện tại, mức sử dụng và tuỳ chọn nâng cấp." />
      <BillingView
        currentPlan={plan as PlanKey}
        usage={usage}
        canManage={role === "owner" || role === "admin"}
        bank={{
          name: process.env.NEXT_PUBLIC_BANK_NAME ?? "",
          account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "",
          holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "",
        }}
        simulateEnabled={process.env.NEXT_PUBLIC_PAYMENT_SIMULATE === "true"}
        expiresAt={org?.plan_expires_at ?? null}
      />
    </>
  );
}
