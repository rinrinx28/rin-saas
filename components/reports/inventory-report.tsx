"use client";

import { useEffect, useRef, useState } from "react";
import { fetchInventoryReport, type InventoryReport } from "@/app/(app)/reports/inventory/actions";
import { DEFAULT_DEAD_DAYS, DEFAULT_THRESHOLD } from "@/app/(app)/reports/inventory/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, Kpi, PALETTE, RankCard } from "@/components/reports/shared";
import { createClient } from "@/lib/supabase/client";
import { cn, formatVnd } from "@/lib/utils";

const DEAD_PERIODS = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 60, label: "60 ngày" },
  { days: 90, label: "90 ngày" },
] as const;

export function InventoryReportView({ initial }: { initial: InventoryReport }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [deadDays, setDeadDays] = useState(DEFAULT_DEAD_DAYS);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(t: number, d: number) {
    setLoading(true);
    setData(await fetchInventoryReport(t, d));
    setLoading(false);
  }

  function onThreshold(raw: string) {
    const n = Number(raw);
    const next = Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : DEFAULT_THRESHOLD;
    setThreshold(next);
    if (inputDebounce.current) clearTimeout(inputDebounce.current);
    inputDebounce.current = setTimeout(() => void load(next, deadDays), 400);
  }

  function onDeadDays(d: number) {
    setDeadDays(d);
    void load(threshold, d);
  }

  // Realtime: kho / phiếu xuất nhập / đơn thay đổi → làm mới (debounce).
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    const refresh = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        if (active) void load(threshold, deadDays);
      }, 800);
    };
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!active) return;
      if (s.session?.access_token) supabase.realtime.setAuth(s.session.access_token);
      ch = supabase
        .channel("reports-inventory")
        .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
        .subscribe();
    })();
    return () => {
      active = false;
      if (debounce.current) clearTimeout(debounce.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [threshold, deadDays]);

  const { summary } = data;
  const potential = summary.retail_value - summary.cost_value;
  const margin = summary.retail_value > 0 ? Math.round((potential / summary.retail_value) * 100) : 0;

  const categoryRows = data.byCategory.map((c) => ({
    name: c.name,
    value: c.retail_value,
    sub: `${c.qty.toLocaleString("vi-VN")} sp · vốn ${formatVnd(c.cost_value)}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <span className={cn("flex items-center gap-1.5 text-xs text-fg-subtle", loading && "text-primary")}>
          <span className={cn("size-1.5 rounded-full bg-success", loading && "animate-pulse bg-primary")} />
          {loading ? "Đang cập nhật…" : "Trực tiếp"}
        </span>
      </div>

      {/* KPI */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Số SKU" value={summary.sku_count.toLocaleString("vi-VN")} />
        <Kpi
          label="Hết hàng"
          value={summary.out_of_stock.toLocaleString("vi-VN")}
          accent={summary.out_of_stock > 0 ? "danger" : undefined}
        />
        <Kpi label="Giá vốn tồn" value={formatVnd(summary.cost_value)} />
        <Kpi label="Giá trị bán" value={formatVnd(summary.retail_value)} />
        <Kpi
          label={`Lãi tiềm năng (${margin}%)`}
          value={formatVnd(potential)}
          accent={potential >= 0 ? "success" : "danger"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Định giá theo danh mục */}
        <RankCard
          title="Định giá tồn theo danh mục"
          desc="Theo giá trị bán"
          rows={categoryRows}
          color={PALETTE[5]}
        />

        {/* Hàng sắp hết */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Hàng sắp hết</CardTitle>
              <CardDescription>Theo từng chi nhánh — tồn ≤ ngưỡng</CardDescription>
            </div>
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              Ngưỡng
              <input
                type="number"
                min={0}
                max={999}
                value={threshold}
                onChange={(e) => onThreshold(e.target.value)}
                className="tnum w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-fg outline-none focus:border-primary"
              />
            </label>
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <p className="py-10 text-center text-sm text-fg-muted">
                Không có hàng nào dưới ngưỡng. 👍
              </p>
            ) : (
              <ul className="space-y-1.5">
                {data.lowStock.map((r, i) => (
                  <li
                    key={`${r.name}-${r.store}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block text-xs text-fg-muted">{r.store}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "tnum block text-sm font-semibold",
                          r.qty <= 0 ? "text-danger" : "text-warning",
                        )}
                      >
                        {r.qty <= 0 ? "Hết hàng" : `Còn ${r.qty}`}
                      </span>
                      <span className="tnum block text-xs text-fg-subtle">{formatVnd(r.price)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hàng tồn đọng */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Hàng tồn đọng</CardTitle>
            <CardDescription>Còn tồn nhưng không bán được trong kỳ — cân nhắc xả hàng</CardDescription>
          </div>
          <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5 text-xs">
            {DEAD_PERIODS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => onDeadDays(p.days)}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  p.days === deadDays ? "bg-primary text-primary-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {data.deadStock.length === 0 ? (
            <Empty />
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {data.deadStock.map((r, i) => (
                <li
                  key={`${r.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {r.last_sold
                        ? `Bán gần nhất ${r.last_sold.slice(8, 10)}/${r.last_sold.slice(5, 7)}/${r.last_sold.slice(0, 4)}`
                        : "Chưa từng bán"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-sm font-semibold">Tồn {r.qty}</span>
                    <span className="tnum block text-xs text-fg-subtle">vốn {formatVnd(r.cost_value)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
