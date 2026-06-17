import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ShiftManager, type ShiftDefinition, type ShiftSummary } from "@/components/shifts/shift-manager";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { OpeningMode } from "@/lib/validations/shift";

export default async function ShiftsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);
  if (!storeId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: store }, { data: org }, { data: defs }, { data: openShift }, { data: history }] =
    await Promise.all([
      supabase.from("stores").select("name").eq("id", storeId).single(),
      supabase.from("organizations").select("shift_opening_mode, shift_fixed_float").eq("id", orgId).single(),
      supabase.rpc("effective_shift_definitions", { p_store: storeId }),
      supabase
        .from("shifts")
        .select("id, opened_at, opening_cash, shift_name, opening_mode, note")
        .eq("store_id", storeId)
        .eq("status", "open")
        .maybeSingle(),
      supabase
        .from("shifts")
        .select("id, opened_at, closed_at, shift_name, opening_cash, expected_cash, closing_cash_counted, diff")
        .eq("store_id", storeId)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(12),
    ]);

  let summary: ShiftSummary | null = null;
  if (openShift) {
    const { data } = await supabase.rpc("shift_summary", { p_shift: openShift.id });
    summary = (data as ShiftSummary | null) ?? null;
  }

  const historyRows = history ?? [];
  const openingMode = (org?.shift_opening_mode ?? "manual") as OpeningMode;

  return (
    <>
      <PageHeader
        title="Ca bán hàng"
        description={`Mở ca, ghi nhận & chốt tiền mặt cuối ca — chi nhánh ${store?.name ?? ""}.`}
      />
      <ShiftManager
        storeId={storeId}
        open={openShift ? { ...openShift, summary: summary! } : null}
        history={historyRows}
        definitions={(defs as ShiftDefinition[] | null) ?? []}
        openingMode={openingMode}
        fixedFloat={org?.shift_fixed_float ?? 0}
        lastClosing={historyRows[0]?.closing_cash_counted ?? 0}
      />
    </>
  );
}
