"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { SuccessCheck } from "@/components/pos/success-check";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/utils";

// Trang xem trước hiệu ứng "Thanh toán thành công" — bấm Lặp lại để chạy lại.
export default function SuccessPreviewPage() {
  const [run, setRun] = useState(0);

  return (
    <div className="grid min-h-dvh place-items-center bg-[oklch(22%_0.01_80/.35)] p-6">
      {/* key={run} remount toàn bộ card → vẽ lại dấu tích + bắn pháo giấy + pop-in */}
      <div
        key={run}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface p-6 text-center shadow-lg animate-[pop-in_0.3s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <SuccessCheck />
        <p className="mt-4 text-lg font-semibold">Thanh toán thành công</p>
        <p className="text-sm text-fg-muted">Đơn HD260615-103045</p>
        <p className="tnum mt-2 text-2xl font-semibold">{formatVnd(250000)}</p>
        <p className="mt-3 text-sm text-fg-muted">Cảm ơn quý khách, hẹn gặp lại! 💚</p>
        <Button className="mt-5 w-full" onClick={() => setRun((n) => n + 1)}>
          <RotateCcw className="size-4" /> Lặp lại
        </Button>
      </div>
    </div>
  );
}
