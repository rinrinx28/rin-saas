import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { CashBook, type CashEntry } from "@/components/cash/cash-book";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function CashPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);
  if (!storeId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: store }, { data: openShift }, { data: entries }] = await Promise.all([
    supabase.from("stores").select("name").eq("id", storeId).single(),
    supabase.from("shifts").select("id").eq("store_id", storeId).eq("status", "open").maybeSingle(),
    supabase
      .from("cash_ledger")
      .select("id, direction, category, amount, note, created_at, shift_id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  return (
    <>
      <PageHeader
        title="Sổ quỹ tiền mặt"
        description={`Phiếu thu/chi tiền mặt — chi nhánh ${store?.name ?? ""}.`}
      />
      <CashBook
        storeId={storeId}
        hasOpenShift={Boolean(openShift)}
        entries={(entries as CashEntry[] | null) ?? []}
      />
    </>
  );
}
