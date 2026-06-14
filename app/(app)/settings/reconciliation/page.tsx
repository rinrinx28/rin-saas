import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  type Integration,
  ReconciliationManager,
  type StoreOpt,
} from "@/components/settings/reconciliation-manager";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default async function ReconciliationSettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "";

  const supabase = await createClient();
  const [{ data: stores }, { data: integrations }, { data: txns }] = await Promise.all([
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
      .limit(50),
  ]);

  const recentTxns = (txns as BankTxn[] | null) ?? [];

  return (
    <>
      <PageHeader
        title="Đối soát tự động"
        description="Kết nối SePay để tự đối soát chuyển khoản và xem sổ giao dịch."
      />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Tích hợp</h2>
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
