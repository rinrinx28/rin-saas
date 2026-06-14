import { ArrowDownRight, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatVnd } from "@/lib/utils";

// Ngưỡng tồn kho coi là "sắp hết" và số dòng tồn thấp hiển thị trên dashboard.
const LOW_STOCK_THRESHOLD = 10;
const LOW_STOCK_LIMIT = 8;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

interface Summary {
  revenue: number;
  orders: number;
  cogs: number;
}
interface InvRow {
  qty: number;
  variant_id: string;
  product_variants: {
    name: string;
    price: number;
    products: { name: string; sku: string | null } | null;
  } | null;
}
interface LowStockRow {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  stock: number;
  price: number;
}

// Mốc nửa đêm hôm nay theo giờ VN, quy về thời điểm UTC.
function vnTodayStartUtc(): Date {
  const nowVn = new Date(Date.now() + VN_OFFSET_MS);
  return new Date(
    Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate()) - VN_OFFSET_MS,
  );
}

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="danger">Hết hàng</Badge>;
  if (stock <= LOW_STOCK_THRESHOLD) return <Badge variant="warning">Sắp hết</Badge>;
  return <Badge variant="success">Còn hàng</Badge>;
}

export default async function DashboardPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const from = vnTodayStartUtc();
  const to = new Date();

  const [{ data: sumData }, { data: inv }, { data: debts }] = await Promise.all([
    supabase.rpc("report_summary", {
      p_org: orgId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    }),
    supabase
      .from("inventory")
      .select("qty, variant_id, product_variants(name, price, products(name, sku))")
      .eq("org_id", orgId),
    supabase.from("customers").select("debt").eq("org_id", orgId).gt("debt", 0),
  ]);

  const summary = (sumData as Summary | null) ?? { revenue: 0, orders: 0, cogs: 0 };

  // Gộp tồn theo biến thể (cộng dồn qua các chi nhánh) → lọc tồn thấp.
  const invRows = (inv as InvRow[] | null) ?? [];
  const byVariant = new Map<string, LowStockRow>();
  for (const r of invRows) {
    const existing = byVariant.get(r.variant_id);
    if (existing) {
      existing.stock += r.qty;
      continue;
    }
    byVariant.set(r.variant_id, {
      variantId: r.variant_id,
      sku: r.product_variants?.products?.sku ?? "—",
      productName: r.product_variants?.products?.name ?? "?",
      variantName: r.product_variants?.name ?? "",
      stock: r.qty,
      price: r.product_variants?.price ?? 0,
    });
  }
  const lowStock = [...byVariant.values()]
    .filter((v) => v.stock <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, LOW_STOCK_LIMIT);
  const lowStockCount = [...byVariant.values()].filter((v) => v.stock <= LOW_STOCK_THRESHOLD).length;

  const debtRows = (debts as { debt: number }[] | null) ?? [];
  const totalDebt = debtRows.reduce((s, r) => s + r.debt, 0);

  const kpis = [
    { label: "Doanh thu hôm nay", value: formatVnd(summary.revenue), hint: "tính theo đơn hoàn tất" },
    { label: "Đơn hàng hôm nay", value: String(summary.orders), hint: "đơn đã chốt" },
    {
      label: "Sản phẩm sắp hết",
      value: String(lowStockCount),
      hint: lowStockCount > 0 ? "cần nhập thêm" : "tồn ổn định",
      warn: lowStockCount > 0,
    },
    {
      label: "Công nợ phải thu",
      value: formatVnd(totalDebt),
      hint: `${debtRows.length} khách`,
      warn: totalDebt > 0,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tổng quan cửa hàng"
        description="Số liệu hôm nay và tình trạng tồn kho theo thời gian thực."
        actions={
          <Button asChild>
            <Link href="/pos">
              <Plus /> Tạo đơn
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-fg-muted">{kpi.label}</p>
                {kpi.warn ? (
                  <ArrowDownRight className="size-4 text-warning" />
                ) : (
                  <TrendingUp className="size-4 text-success" />
                )}
              </div>
              <div className="mt-2">
                <span className="tnum text-3xl font-semibold tracking-tight">{kpi.value}</span>
              </div>
              <p className="mt-1 text-xs text-fg-muted">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Sản phẩm sắp hết hàng</CardTitle>
            <CardDescription>Tồn ≤ {LOW_STOCK_THRESHOLD} — cần lên kế hoạch nhập thêm</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory">Xem tồn kho</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {lowStock.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-fg-muted">
              Không có sản phẩm nào dưới ngưỡng tồn. 🎉
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>SKU</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.variantId}>
                    <TableCell className="tnum text-fg-muted">{p.sku}</TableCell>
                    <TableCell className="font-medium">
                      {p.productName}
                      <span className="text-fg-muted"> — {p.variantName}</span>
                    </TableCell>
                    <TableCell className="text-center">{stockBadge(p.stock)}</TableCell>
                    <TableCell className="tnum text-right">{p.stock}</TableCell>
                    <TableCell className="tnum text-right">{formatVnd(p.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
