import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { OrgBankForm } from "@/components/settings/org-bank-form";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import {
  type Integration,
  ReconciliationManager,
  type StoreOpt,
} from "@/components/settings/reconciliation-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listGateways } from "@/lib/payment/gateways";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";

interface BankTxn {
  id: string;
  created_at: string;
  amount: number;
  content: string | null;
  status: string;
  matched_order_id: string | null;
  applied_amount: number;
}

const TXN_BADGE: Record<string, { label: string; variant: "success" | "warning" | "neutral" | "info" }> = {
  matched: { label: "Đã khớp", variant: "success" },
  already_paid: { label: "Đơn đã đủ tiền", variant: "info" },
  unmatched: { label: "Chưa khớp", variant: "warning" },
  duplicate: { label: "Trùng", variant: "neutral" },
  pending: { label: "Đang xử lý", variant: "info" },
};

export default async function SettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "";

  const supabase = await createClient();
  const [{ data: org }, { data: stores }, { data: integrations }, { data: txns }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, bank_name, bank_account, bank_holder")
      .eq("id", orgId)
      .single(),
    supabase.from("stores").select("id, name").eq("org_id", orgId).order("created_at"),
    supabase
      .from("payment_integrations")
      .select("id, store_id, provider, webhook_token, webhook_secret, enabled")
      .eq("org_id", orgId)
      .order("created_at"),
    supabase
      .from("bank_transactions")
      .select("id, created_at, amount, content, status, matched_order_id, applied_amount")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const recentTxns = (txns as BankTxn[] | null) ?? [];

  return (
    <>
      <PageHeader title="Cửa hàng" description="Thông tin cửa hàng, phương thức thanh toán và đối soát." />
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

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Đối soát tự động</h2>
          <ReconciliationManager
            integrations={(integrations as Integration[] | null) ?? []}
            stores={(stores as StoreOpt[] | null) ?? []}
            baseUrl={baseUrl}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Sổ giao dịch chuyển khoản</h2>
          <Card>
            {recentTxns.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-fg-muted">
                Chưa có giao dịch nào. Khi khách chuyển khoản qua SePay, giao dịch sẽ hiện ở đây.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-right">Đơn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTxns.map((t) => {
                    const badge = TXN_BADGE[t.status] ?? TXN_BADGE.pending;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="tnum text-fg-muted">
                          {new Date(t.created_at).toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell className="max-w-65 truncate text-fg-muted">{t.content ?? "—"}</TableCell>
                        <TableCell className="tnum text-right font-medium">{formatVnd(t.amount)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.matched_order_id ? (
                            <Link href={`/orders/${t.matched_order_id}`} className="text-primary hover:underline">
                              Xem
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
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
