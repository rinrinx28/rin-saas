import { ArrowLeft, Hammer, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// POS fullscreen — không sidebar (ADR 0005). Dùng root layout (font + theme).
export default function PosPage() {
  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Button variant="ghost" size="icon" aria-label="Quay lại" asChild>
          <Link href="/dashboard">
            <ArrowLeft />
          </Link>
        </Button>
        <ShoppingCart className="size-5 text-primary" />
        <span className="font-display text-lg font-semibold tracking-tight">
          Bán hàng
        </span>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col items-center justify-center gap-3 border-border p-8 text-center lg:border-r">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <Hammer className="size-5" />
          </div>
          <p className="font-medium">Màn hình bán hàng — đang xây dựng</p>
          <p className="max-w-sm text-sm text-fg-muted">
            Tìm/quét sản phẩm, giỏ hàng, chiết khấu, thanh toán → trừ kho.
            Thuộc <span className="font-medium text-fg">Phase 2 — Core POS</span>.
          </p>
        </div>
        <aside className="hidden flex-col bg-surface p-5 lg:flex">
          <p className="text-sm font-medium text-fg-muted">Giỏ hàng</p>
          <div className="mt-4 flex-1 rounded-lg border border-dashed border-border" />
          <Button className="mt-4" disabled>
            Thu tiền
          </Button>
        </aside>
      </div>
    </div>
  );
}
