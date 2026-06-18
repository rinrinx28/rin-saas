"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchReportData, type ReportData } from "@/app/(app)/reports/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AXIS,
  Bar,
  Empty,
  GRID,
  Kpi,
  PALETTE,
  PeriodBar,
  PRIMARY,
  PROFIT,
  RankCard,
  TOOLTIP_STYLE,
  compact,
  dmFmt,
} from "@/components/reports/shared";
import { createClient } from "@/lib/supabase/client";
import { cn, formatVnd } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
};

export function ReportsDashboard({ initial, initialDays }: { initial: ReportData; initialDays: number }) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [productMetric, setProductMetric] = useState<"revenue" | "qty" | "profit">("revenue");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(d: number) {
    setLoading(true);
    const fresh = await fetchReportData(d);
    setData(fresh);
    setLoading(false);
  }

  function selectPeriod(d: number) {
    setDays(d);
    void load(d);
  }

  // Realtime: có đơn / phiếu nhập mới → cập nhật báo cáo (debounce).
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    const refresh = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        if (active) void load(days);
      }, 800);
    };
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!active) return;
      if (s.session?.access_token) supabase.realtime.setAuth(s.session.access_token);
      ch = supabase
        .channel("reports")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders" }, refresh)
        .subscribe();
    })();
    return () => {
      active = false;
      if (debounce.current) clearTimeout(debounce.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [days]);

  const { summary, inventory } = data;
  const profit = summary.revenue - summary.cogs;
  const margin = summary.revenue > 0 ? Math.round((profit / summary.revenue) * 100) : 0;

  const productMetricValue = (p: { revenue?: number; qty?: number; profit?: number }) =>
    productMetric === "qty" ? (p.qty ?? 0) : productMetric === "profit" ? (p.profit ?? 0) : (p.revenue ?? 0);
  const productFmt = (n: number) => (productMetric === "qty" ? `${n} sp` : formatVnd(n));
  const productRows = [...data.topProducts]
    .sort((a, b) => productMetricValue(b) - productMetricValue(a))
    .map((p) => ({
      name: p.name,
      value: productMetricValue(p),
      sub: `Bán ${p.qty ?? 0} · Lãi ${formatVnd(p.profit ?? 0)}`,
    }));
  const purchasedRows = data.topPurchased.map((p) => ({
    name: p.name,
    value: p.value ?? 0,
    sub: `Nhập ${p.qty ?? 0}`,
  }));
  const customerRows = data.topCustomers.map((c) => ({
    name: c.name,
    value: c.revenue ?? 0,
    sub: `${c.orders ?? 0} đơn`,
  }));
  const supplierRows = data.topSuppliers.map((s) => ({
    name: s.name,
    value: s.value ?? 0,
    sub: `${s.orders ?? 0} phiếu`,
  }));
  const paymentRows = data.payments.map((p) => ({
    name: METHOD_LABEL[p.method] ?? p.method,
    value: p.amount,
  }));
  const promoRows = data.promotions.map((p) => ({
    name: p.code ? `${p.name} (${p.code})` : p.name,
    value: p.discount,
    sub: `${p.uses} lượt · DT ${formatVnd(p.revenue)}`,
  }));
  const promoTotal = data.promotions.reduce((s, p) => s + p.discount, 0);

  return (
    <div className="space-y-4">
      <PeriodBar days={days} loading={loading} onSelect={selectPeriod} />

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Doanh thu" value={formatVnd(summary.revenue)} />
        <Kpi label="Số đơn" value={String(summary.orders)} />
        <Kpi label="Lãi gộp" value={formatVnd(profit)} accent={profit >= 0 ? "success" : "danger"} />
        <Kpi label="Biên lãi" value={`${margin}%`} />
        <Kpi label="Giá trị tồn (bán)" value={formatVnd(inventory.retail)} />
      </section>

      {/* Doanh thu theo ngày + Phương thức */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu & lãi gộp</CardTitle>
            <CardDescription>Theo ngày trong {days} ngày gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {data.daily.some((d) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.daily} margin={{ left: 4, right: 8, top: 4 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="day" tickFormatter={dmFmt} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
                  <YAxis tickFormatter={compact} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(l) => dmFmt(String(l))}
                    formatter={(v, n) => [formatVnd(Number(v)), n === "revenue" ? "Doanh thu" : "Lãi gộp"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={2} fill="url(#revFill)" />
                  <Line type="monotone" dataKey="profit" stroke={PROFIT} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phương thức thanh toán</CardTitle>
            <CardDescription>Theo số tiền</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentRows.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={paymentRows} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="var(--surface)">
                      {paymentRows.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatVnd(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-2 space-y-1.5">
                  {paymentRows.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                        {p.name}
                      </span>
                      <span className="tnum font-medium">{formatVnd(p.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bảng xếp hạng */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RankCard
          title="Bán chạy nhất"
          desc={
            productMetric === "qty"
              ? "Theo số lượng bán"
              : productMetric === "profit"
                ? "Theo lãi gộp"
                : "Theo doanh thu"
          }
          rows={productRows}
          color={PALETTE[0]}
          format={productFmt}
          headerAction={
            <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5 text-xs">
              {(
                [
                  ["revenue", "Doanh thu"],
                  ["qty", "SL"],
                  ["profit", "Lãi"],
                ] as const
              ).map(([m, lbl]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setProductMetric(m)}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition-colors",
                    productMetric === m ? "bg-primary text-primary-fg" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
          }
        />
        <RankCard title="Nhập nhiều nhất" desc="Theo giá trị nhập" rows={purchasedRows} color={PALETTE[2]} />
        <RankCard title="Khách hàng hàng đầu" desc="Theo chi tiêu" rows={customerRows} color={PALETTE[1]} />
        <RankCard title="Nhà cung cấp hàng đầu" desc="Theo giá trị nhập" rows={supplierRows} color={PALETTE[4]} />
        <RankCard
          title="Khuyến mãi"
          desc={`Theo tiền đã giảm · tổng ${formatVnd(promoTotal)}`}
          rows={promoRows}
          color={PALETTE[3]}
        />
      </div>

      {/* Bán ra vs Nhập vào */}
      <SalesVsPurchasesCard rows={data.salesVsPurchases} />
    </div>
  );
}

function SalesVsPurchasesCard({ rows }: { rows: { name: string; sold: number; purchased: number }[] }) {
  const max = Math.max(...rows.flatMap((r) => [r.sold, r.purchased]), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bán ra vs Nhập vào</CardTitle>
        <CardDescription>Số lượng theo sản phẩm — nhận diện hàng bán nhanh / tồn đọng</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="mb-3 flex items-center gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: "oklch(72% 0.17 155)" }} /> Bán ra
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: "var(--primary)" }} /> Nhập vào
              </span>
            </div>
            <ul className="space-y-3">
              {rows.map((r, i) => (
                <li key={`${r.name}-${i}`}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="tnum shrink-0 text-fg-muted">
                      Bán {r.sold} · Nhập {r.purchased}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Bar value={r.sold} max={max} color="oklch(72% 0.17 155)" />
                    <Bar value={r.purchased} max={max} color="var(--primary)" />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
