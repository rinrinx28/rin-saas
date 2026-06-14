import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn, formatVnd } from "@/lib/utils";

const PERIODS = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
] as const;

interface Summary {
  revenue: number;
  orders: number;
  cogs: number;
}
interface TopRow {
  name: string;
  qty: number;
  revenue: number;
}
interface InvRow {
  qty: number;
  product_variants: { cost: number; price: number } | null;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const { period } = await searchParams;
  const days = PERIODS.some((p) => String(p.days) === period) ? Number(period) : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);

  const supabase = await createClient();
  const [{ data: sumData }, { data: top }, { data: inv }] = await Promise.all([
    supabase.rpc("report_summary", {
      p_org: orgId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    }),
    supabase.rpc("top_products", {
      p_org: orgId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_limit: 5,
    }),
    supabase.from("inventory").select("qty, product_variants(cost, price)").eq("org_id", orgId),
  ]);

  const summary = (sumData as Summary | null) ?? { revenue: 0, orders: 0, cogs: 0 };
  const topRows = (top as TopRow[] | null) ?? [];
  const profit = summary.revenue - summary.cogs;
  const margin = summary.revenue > 0 ? Math.round((profit / summary.revenue) * 100) : 0;

  const invRows = (inv as InvRow[] | null) ?? [];
  const stockCost = invRows.reduce((s, r) => s + r.qty * (r.product_variants?.cost ?? 0), 0);
  const stockRetail = invRows.reduce((s, r) => s + r.qty * (r.product_variants?.price ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Báo cáo"
        description="Phân tích doanh thu, lãi/lỗ và giá trị tồn kho theo kỳ."
        actions={
          <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
            {PERIODS.map((p) => (
              <Link
                key={p.days}
                href={`/reports?period=${p.days}`}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  p.days === days ? "bg-primary text-primary-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Doanh thu" value={formatVnd(summary.revenue)} />
        <Kpi label="Số đơn" value={String(summary.orders)} />
        <Kpi label="Lãi gộp" value={formatVnd(profit)} accent={profit >= 0 ? "success" : "danger"} />
        <Kpi label="Biên lãi gộp" value={`${margin}%`} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Top sản phẩm bán chạy</CardTitle>
            <CardDescription>Theo doanh thu trong kỳ</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {topRows.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-fg-muted">Chưa có dữ liệu bán hàng trong kỳ.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">SL bán</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRows.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="tnum text-right">{r.qty}</TableCell>
                      <TableCell className="tnum text-right">{formatVnd(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Giá trị tồn kho</CardTitle>
            <CardDescription>Toàn bộ chi nhánh</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">Theo giá vốn</span>
              <span className="tnum font-semibold">{formatVnd(stockCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">Theo giá bán</span>
              <span className="tnum">{formatVnd(stockRetail)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-fg-muted">Lãi dự kiến nếu bán hết</span>
              <span className="tnum text-success">{formatVnd(stockRetail - stockCost)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-fg-muted">{label}</p>
        <p
          className={cn(
            "tnum mt-1 text-2xl font-semibold tracking-tight",
            accent === "success" && "text-success",
            accent === "danger" && "text-danger",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
