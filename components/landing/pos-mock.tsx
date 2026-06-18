import { QrCode, Search, Trash2 } from "lucide-react";

// Mock màn POS tĩnh — token-only, aria-hidden. Dùng ở showcase.
const PRODUCTS = [
  { name: "Áo thun cotton", price: "189.000", tint: "bg-primary/10" },
  { name: "Quần jeans slim", price: "459.000", tint: "bg-info/10" },
  { name: "Sơ mi linen", price: "329.000", tint: "bg-success/10" },
  { name: "Váy hoa nhí", price: "275.000", tint: "bg-warning/10" },
  { name: "Áo khoác dù", price: "390.000", tint: "bg-primary/10" },
  { name: "Mũ lưỡi trai", price: "120.000", tint: "bg-info/10" },
];

const CART = [
  { name: "Áo thun cotton", qty: 2, line: "378.000" },
  { name: "Quần jeans slim", qty: 1, line: "459.000" },
];

export function PosMock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-lg ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-danger/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-fg-subtle">Lumi — Bán hàng</span>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] divide-x divide-border">
        {/* Lưới sản phẩm */}
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg-subtle">
            <Search className="size-4" /> Tìm hoặc quét mã vạch…
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="rounded-lg border border-border p-2">
                <div className={`mb-2 h-10 rounded-md ${p.tint}`} />
                <p className="truncate text-[11px] font-medium leading-tight">{p.name}</p>
                <p className="tnum text-[11px] text-fg-muted">{p.price} ₫</p>
              </div>
            ))}
          </div>
        </div>

        {/* Giỏ hàng */}
        <div className="flex flex-col p-4">
          <p className="text-sm font-medium">Giỏ hàng</p>
          <div className="mt-3 flex-1 space-y-2">
            {CART.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary-bg text-[10px] font-semibold text-primary">
                    {c.qty}
                  </span>
                  <span className="truncate text-fg-muted">{c.name}</span>
                </span>
                <span className="tnum shrink-0 font-medium">{c.line} ₫</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-fg-subtle">
              <Trash2 className="size-3" /> Vuốt để xóa
            </div>
          </div>

          <div className="mt-3 space-y-1 border-t border-border pt-3 text-[11px]">
            <div className="flex justify-between text-fg-muted">
              <span>Tạm tính</span>
              <span className="tnum">837.000 ₫</span>
            </div>
            <div className="flex justify-between text-fg-muted">
              <span>Giảm giá</span>
              <span className="tnum">−37.000 ₫</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs font-medium">Tổng</span>
              <span className="tnum text-lg font-semibold text-primary">800.000 ₫</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-fg shadow-sm">
            <QrCode className="size-4" /> Thu tiền · QR
          </div>
        </div>
      </div>
    </div>
  );
}
