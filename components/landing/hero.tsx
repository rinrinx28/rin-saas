import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { DashboardMock } from "@/components/landing/dashboard-mock";
import { Button } from "@/components/ui/button";

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* Hào quang nền — chỉ trang trí */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[480px] max-w-4xl opacity-70 blur-3xl [background:radial-gradient(50%_50%_at_50%_50%,var(--primary-bg),transparent_70%)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        {/* Cột chữ */}
        <div className="max-w-xl">
          <span className="hero-fx inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            Quản lý bán hàng · Đa chi nhánh · Realtime
          </span>

          <h1
            id="hero-heading"
            className="hero-fx mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Bán hàng gọn gàng,
            <br />
            kho minh bạch,{" "}
            <span className="italic text-primary">báo cáo tức thì.</span>
          </h1>

          <p className="hero-fx mt-5 text-lg leading-relaxed text-fg-muted">
            Lumi hợp nhất điểm bán hàng (POS), tồn kho đa chi nhánh, hóa đơn điện tử và đối
            soát chuyển khoản — trong một nơi, cập nhật theo thời gian thực.
          </p>

          <div className="hero-fx mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={isAuthed ? "/app" : "/register"}>
                {isAuthed ? "Vào ứng dụng" : "Dùng thử miễn phí"}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Xem tính năng</a>
            </Button>
          </div>

          <p className="hero-fx mt-4 flex items-center gap-2 text-sm text-fg-subtle">
            <CheckCircle2 className="size-4 text-success" />
            Miễn phí gói khởi đầu · Không cần thẻ tín dụng
          </p>
        </div>

        {/* Cột visual — phân lớp */}
        <div className="hero-fx relative">
          <DashboardMock className="relative z-10" />

          {/* Chip nổi đè góc — tạo chiều sâu */}
          <div className="absolute -bottom-5 -left-4 z-20 hidden items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-lg sm:flex">
            <span className="flex size-8 items-center justify-center rounded-lg bg-success-bg text-success">
              <CheckCircle2 className="size-4" />
            </span>
            <div className="text-xs">
              <p className="font-medium">Tiền về tài khoản</p>
              <p className="text-fg-subtle">Tự đối soát · khớp đơn</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
