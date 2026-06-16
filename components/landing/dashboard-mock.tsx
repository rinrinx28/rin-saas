import { ArrowUpRight, Boxes, Receipt, Wallet } from "lucide-react";

// Mock dashboard tĩnh dùng đúng design token — tạo chiều sâu cho hero/showcase
// mà không cần ảnh chụp. Chỉ trang trí (aria-hidden).
const BARS = [38, 52, 44, 67, 58, 80, 72];

export function DashboardMock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-lg ${className}`}
    >
      {/* Thanh cửa sổ */}
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-danger/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-fg-subtle">rin·saas — Tổng quan</span>
      </div>

      <div className="space-y-4 p-5">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <Kpi icon={Wallet} label="Doanh thu" value="42,8tr" tint="text-primary" />
          <Kpi icon={Receipt} label="Đơn" value="318" tint="text-success" />
          <Kpi icon={Boxes} label="Tồn (bán)" value="1,2tỷ" tint="text-info" />
        </div>

        {/* Biểu đồ + trạng thái realtime */}
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Doanh thu 7 ngày</p>
            <span className="flex items-center gap-1.5 text-[11px] text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> Trực tiếp
            </span>
          </div>
          <div className="flex h-24 items-end gap-2">
            {BARS.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary/15">
                <div
                  className="rounded-t bg-primary/80"
                  style={{ height: `${h}%`, minHeight: 4 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dòng đơn gần nhất */}
        <div className="space-y-2">
          {[
            { code: "HD260616-1042", amount: "250.000 ₫", ok: true },
            { code: "HD260616-1041", amount: "1.180.000 ₫", ok: true },
          ].map((r) => (
            <div
              key={r.code}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="tnum text-fg-muted">{r.code}</span>
              <span className="flex items-center gap-2">
                <span className="tnum font-medium">{r.amount}</span>
                <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-medium text-success">
                  Đã thu <ArrowUpRight className="size-3" />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <Icon className={`size-4 ${tint}`} />
      <p className="mt-2 text-[11px] text-fg-muted">{label}</p>
      <p className="tnum text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
