import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

const FOOTER_COLS = [
  {
    title: "Sản phẩm",
    links: [
      { href: "#features", label: "Tính năng" },
      { href: "#pricing", label: "Bảng giá" },
      { href: "#showcase", label: "Trải nghiệm" },
    ],
  },
  {
    title: "Tài khoản",
    links: [
      { href: "/login", label: "Đăng nhập" },
      { href: "/register", label: "Đăng ký" },
    ],
  },
];

export function CtaFooter({ isAuthed }: { isAuthed: boolean }) {
  return (
    <>
      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div
          data-reveal
          className="relative overflow-hidden rounded-3xl border border-border bg-primary px-8 py-16 text-center text-primary-fg shadow-lg"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(60%_60%_at_50%_0%,oklch(100%_0_0/.25),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Sẵn sàng bán hàng gọn hơn?
            </h2>
            <p className="mt-3 text-primary-fg/85">
              Tạo cửa hàng đầu tiên trong vài phút. Miễn phí gói khởi đầu, không cần thẻ.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary shadow-sm hover:bg-white/90"
              >
                <Link href={isAuthed ? "/app" : "/register"}>
                  {isAuthed ? "Vào ứng dụng" : "Dùng thử miễn phí"}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <LogoMark className="size-5 text-primary" />
              <span className="font-display text-lg font-semibold tracking-tight">Lumi</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-fg-muted">
              Phần mềm quản lý bán hàng, tồn kho và hóa đơn cho cửa hàng vừa và nhỏ — đa chi nhánh,
              thời gian thực.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-fg-muted transition-colors hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-6xl px-5 py-6 text-center text-xs text-fg-subtle sm:text-left">
            © 2026 Lumi — POS cho cửa hàng vừa và nhỏ.
          </p>
        </div>
      </footer>
    </>
  );
}
