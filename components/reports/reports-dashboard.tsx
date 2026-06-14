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
import { createClient } from "@/lib/supabase/client";
import { cn, formatVnd } from "@/lib/utils";

const PERIODS = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
] as const;

const PRIMARY = "var(--primary)";
const PROFIT = "oklch(72% 0.17 155)";
const AXIS = "var(--fg-subtle)";
const GRID = "var(--border)";
const PALETTE = [
  "var(--primary)",
  "oklch(72% 0.17 155)",
  "oklch(76% 0.15 70)",
  "oklch(67% 0.2 20)",
  "oklch(70% 0.14 320)",
  "oklch(72% 0.13 200)",
];

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
};

function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")} tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}tr`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}
const dmFmt = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--fg)",
  fontSize: "0.8rem",
} as const;

export function ReportsDashboard({ initial, initialDays }: { initial: ReportData; initialDays: number }) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
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

  const productRows = data.topProducts.map((p) => ({
    name: p.name,
    value: p.revenue ?? 0,
    sub: `Đã bán ${p.qty ?? 0}`,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => selectPeriod(p.days)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                p.days === days ? "bg-primary text-primary-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className={cn("flex items-center gap-1.5 text-xs text-fg-subtle", loading && "text-primary")}>
          <span className={cn("size-1.5 rounded-full bg-success", loading && "animate-pulse bg-primary")} />
          {loading ? "Đang cập nhật…" : "Trực tiếp"}
        </span>
      </div>

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
        <RankCard title="Bán chạy nhất" desc="Theo doanh thu" rows={productRows} color={PALETTE[0]} />
        <RankCard title="Nhập nhiều nhất" desc="Theo giá trị nhập" rows={purchasedRows} color={PALETTE[2]} />
        <RankCard title="Khách hàng hàng đầu" desc="Theo chi tiêu" rows={customerRows} color={PALETTE[1]} />
        <RankCard title="Nhà cung cấp hàng đầu" desc="Theo giá trị nhập" rows={supplierRows} color={PALETTE[4]} />
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-4">
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

interface Row {
  name: string;
  value: number;
  sub: string;
}

function RankCard({ title, desc, rows, color }: { title: string; desc: string; rows: Row[]; color: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className="relative overflow-hidden rounded-md border border-border px-3 py-2"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-500 ease-out"
                  style={{ width: `${(r.value / max) * 100}%`, background: color, opacity: 0.12 }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="tnum w-4 shrink-0 text-xs text-fg-subtle">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block text-xs text-fg-muted">{r.sub}</span>
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-sm font-semibold">{formatVnd(r.value)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-fg-muted">Chưa có dữ liệu trong kỳ.</p>;
}
