import { BarChart3, Boxes, ReceiptText } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";

const highlights = [
  { icon: Boxes, text: "Quản lý tồn kho đa chi nhánh theo thời gian thực" },
  { icon: ReceiptText, text: "Bán hàng, hóa đơn và công nợ trong một nơi" },
  { icon: BarChart3, text: "Báo cáo doanh thu, lãi/lỗ trực quan" },
] as const;

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — ẩn trên mobile */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-fg lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(60%_60%_at_30%_20%,oklch(99%_0_0/.35),transparent_70%)]"
        />
        <div className="relative flex items-center gap-2">
          <LogoMark className="size-6" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Lumi
          </span>
        </div>

        <div className="relative space-y-6">
          <h2 className="max-w-md font-display text-4xl font-semibold leading-tight tracking-tight">
            Quản lý bán hàng, gọn trong một nơi.
          </h2>
          <ul className="space-y-3">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.text} className="flex items-center gap-3 text-primary-fg/90">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm">{h.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-primary-fg/70">
          © 2026 Lumi — POS cho cửa hàng vừa và nhỏ.
        </p>
      </aside>

      {/* Form area */}
      <main className="flex items-center justify-center bg-bg px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
