import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { LoyaltyForm } from "@/components/settings/loyalty-form";
import { OrgBankForm } from "@/components/settings/org-bank-form";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { type ShiftDef, ShiftSettings } from "@/components/settings/shift-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listGateways } from "@/lib/payment/gateways";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { OpeningMode } from "@/lib/validations/shift";

export default async function SettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const storeId = await getActiveStoreId(orgId);
  const [{ data: org }, { data: store }, { data: defs }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "name, logo_url, bank_name, bank_account, bank_holder, loyalty_enabled, loyalty_earn_per_k, loyalty_redeem_value, loyalty_min_redeem, shift_opening_mode, shift_fixed_float",
      )
      .eq("id", orgId)
      .single(),
    storeId ? supabase.from("stores").select("name").eq("id", storeId).single() : Promise.resolve({ data: null }),
    supabase
      .from("shift_definitions")
      .select("id, name, start_time, end_time, store_id")
      .eq("org_id", orgId)
      .order("sort_order")
      .order("name"),
  ]);

  const allDefs = (defs as ShiftDef[] | null) ?? [];
  const orgDefs = allDefs.filter((d) => d.store_id === null);
  const storeDefs = allDefs.filter((d) => d.store_id === storeId);

  return (
    <>
      <PageHeader title="Cửa hàng" description="Thông tin cửa hàng và phương thức thanh toán." />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Thông tin</h2>
          <OrgSettingsForm name={org?.name ?? ""} logoUrl={org?.logo_url ?? null} orgId={orgId} />
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Tài khoản nhận tiền</h2>
          <OrgBankForm
            values={{
              bankName: org?.bank_name ?? "",
              bankAccount: org?.bank_account ?? "",
              bankHolder: org?.bank_holder ?? "",
            }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Ca bán hàng</h2>
          <ShiftSettings
            config={{
              openingMode: (org?.shift_opening_mode ?? "manual") as OpeningMode,
              fixedFloat: org?.shift_fixed_float ?? 0,
            }}
            orgDefs={orgDefs}
            storeDefs={storeDefs}
            storeName={store?.name ?? ""}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Tích điểm khách hàng</h2>
          <LoyaltyForm
            values={{
              enabled: org?.loyalty_enabled ?? false,
              earnPerK: org?.loyalty_earn_per_k ?? 0,
              redeemValue: org?.loyalty_redeem_value ?? 1000,
              minRedeem: org?.loyalty_min_redeem ?? 0,
            }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Phương thức thanh toán</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              <MethodRow name="Tiền mặt / Chuyển khoản QR" desc="Quét QR VietQR theo tài khoản đã cấu hình." active />
              {listGateways().map((g) => (
                <MethodRow
                  key={g.key}
                  name={g.name}
                  desc="Cổng thanh toán — cần cấu hình merchant (đang ở chế độ adapter)."
                  active={g.configured}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

function MethodRow({ name, desc, active }: { name: string; desc: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-fg-muted">{desc}</p>
      </div>
      {active ? (
        <Badge variant="success">Đang hoạt động</Badge>
      ) : (
        <Badge variant="neutral">Chưa cấu hình</Badge>
      )}
    </div>
  );
}
