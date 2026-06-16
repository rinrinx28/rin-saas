"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchProfitReport, type ProfitReport } from "@/app/(app)/reports/profit/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AXIS,
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
import { formatVnd } from "@/lib/utils";

const marginOf = (profit: number, revenue: number) =>
  revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

export function ProfitReportView({ initial, initialDays }: { initial: ProfitReport; initialDays: number }) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(d: number) {
    setLoading(true);
    setData(await fetchProfitReport(d));
    setLoading(false);
  }

  function selectPeriod(d: number) {
    setDays(d);
    void load(d);
  }

  // Realtime: đơn mới → lãi thay đổi (debounce).
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
        .channel("reports-profit")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
        .subscribe();
    })();
    return () => {
      active = false;
      if (debounce.current) clearTimeout(debounce.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [days]);

  const { summary } = data;
  const profit = summary.revenue - summary.cogs;
  const margin = marginOf(profit, summary.revenue);

  const productRows = data.byProduct.map((p) => ({
    name: p.name,
    value: p.profit ?? 0,
    sub: `DT ${formatVnd(p.revenue ?? 0)} · biên ${marginOf(p.profit ?? 0, p.revenue ?? 0)}%`,
  }));
  const categoryRows = data.byCategory.map((c) => ({
    name: c.name,
    value: c.profit,
    sub: `DT ${formatVnd(c.revenue)} · biên ${marginOf(c.profit, c.revenue)}%`,
  }));

  return (
    <div className="space-y-4">
      <PeriodBar days={days} loading={loading} onSelect={selectPeriod} />

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Doanh thu" value={formatVnd(summary.revenue)} />
        <Kpi label="Giá vốn (COGS)" value={formatVnd(summary.cogs)} />
        <Kpi label="Lãi gộp" value={formatVnd(profit)} accent={profit >= 0 ? "success" : "danger"} />
        <Kpi label="Biên lãi" value={`${margin}%`} accent={profit >= 0 ? "success" : "danger"} />
      </section>

      {/* Lãi gộp theo ngày */}
      <Card>
        <CardHeader>
          <CardTitle>Lãi gộp theo ngày</CardTitle>
          <CardDescription>Lãi gộp & doanh thu trong {days} ngày gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {data.daily.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.daily} margin={{ left: 4, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PROFIT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PROFIT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="day" tickFormatter={dmFmt} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
                <YAxis tickFormatter={compact} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(l) => dmFmt(String(l))}
                  formatter={(v, n) => [formatVnd(Number(v)), n === "profit" ? "Lãi gộp" : "Doanh thu"]}
                />
                <Area type="monotone" dataKey="profit" stroke={PROFIT} strokeWidth={2} fill="url(#profitFill)" />
                <Line type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </CardContent>
      </Card>

      {/* Lãi theo SP + danh mục */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RankCard title="Lãi theo sản phẩm" desc="Lãi gộp cao nhất trong kỳ" rows={productRows} color={PROFIT} />
        <RankCard title="Lãi theo danh mục" desc="Lãi gộp theo nhóm hàng" rows={categoryRows} color={PALETTE[0]} />
      </div>
    </div>
  );
}
