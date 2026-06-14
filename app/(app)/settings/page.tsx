import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { OrgBankForm } from "@/components/settings/org-bank-form";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listGateways } from "@/lib/payment/gateways";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, bank_name, bank_account, bank_holder")
    .eq("id", orgId)
    .single();

  return (
    <>
      <PageHeader title="Cửa hàng" description="Thông tin tổ chức và tài khoản nhận tiền." />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Thông tin</h2>
          <OrgSettingsForm name={org?.name ?? ""} />
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
          <h2 className="font-display text-lg font-semibold tracking-tight">Phương thức thanh toán</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              <MethodRow
                name="Tiền mặt / Chuyển khoản QR"
                desc="Quét QR VietQR theo tài khoản đã cấu hình."
                active
              />
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
