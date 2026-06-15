import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatVnd } from "@/lib/utils";

// ── Màu & style chung cho biểu đồ báo cáo ──────────────────────
export const PRIMARY = "var(--primary)";
export const PROFIT = "oklch(72% 0.17 155)";
export const AXIS = "var(--fg-subtle)";
export const GRID = "var(--border)";
export const PALETTE = [
  "var(--primary)",
  "oklch(72% 0.17 155)",
  "oklch(76% 0.15 70)",
  "oklch(67% 0.2 20)",
  "oklch(70% 0.14 320)",
  "oklch(72% 0.13 200)",
];

export const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--fg)",
  fontSize: "0.8rem",
} as const;

export const PERIODS = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
] as const;

/** Rút gọn số lớn (vd 1.2 tỷ, 350k) cho trục biểu đồ. */
export function compact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")} tỷ`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}tr`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

/** YYYY-MM-DD → dd/MM cho nhãn ngày. */
export const dmFmt = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

export function Kpi({
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

export interface Row {
  name: string;
  value: number;
  sub: string;
}

export function RankCard({
  title,
  desc,
  rows,
  color,
  format = formatVnd,
  headerAction,
}: {
  title: string;
  desc: string;
  rows: Row[];
  color: string;
  format?: (n: number) => string;
  headerAction?: React.ReactNode;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r, i) => {
              const share = total > 0 ? Math.round((r.value / total) * 100) : 0;
              return (
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
                    <span className="shrink-0 text-right">
                      <span className="tnum block text-sm font-semibold">{format(r.value)}</span>
                      <span className="tnum block text-xs text-fg-subtle">{share}%</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${(value / max) * 100}%`, background: color }}
      />
    </div>
  );
}

export function Empty() {
  return <p className="py-10 text-center text-sm text-fg-muted">Chưa có dữ liệu trong kỳ.</p>;
}

/** Bộ chọn khoảng thời gian + đèn báo trạng thái realtime. */
export function PeriodBar({
  days,
  loading,
  onSelect,
}: {
  days: number;
  loading: boolean;
  onSelect: (d: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => onSelect(p.days)}
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
  );
}
