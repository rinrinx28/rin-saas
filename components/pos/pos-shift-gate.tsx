import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { OpenShiftForm, type ShiftDefinition } from "@/components/shifts/shift-manager";
import type { OpeningMode } from "@/lib/validations/shift";

interface PosShiftGateProps {
  storeId: string;
  storeName: string;
  definitions: ShiftDefinition[];
  openingMode: OpeningMode;
  fixedFloat: number;
  lastClosing: number;
}

// Màn chặn POS khi chi nhánh chưa mở ca — bắt mở ca trước khi bán hàng.
// Mở ca xong, OpenShiftForm gọi router.refresh() → server component POS render lại
// và vào thẳng màn bán hàng.
export function PosShiftGate({
  storeId,
  storeName,
  definitions,
  openingMode,
  fixedFloat,
  lastClosing,
}: PosShiftGateProps) {
  return (
    <main className="grid min-h-svh place-items-center bg-surface p-4">
      <div className="w-full max-w-md space-y-5">
        <header className="space-y-1.5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-bg text-primary">
            <Clock className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Cần mở ca để bán hàng</h1>
          <p className="text-sm text-fg-muted">
            Hãy mở ca bán hàng cho chi nhánh{storeName ? ` ${storeName}` : ""} trước khi vào màn hình
            POS.
          </p>
        </header>

        <OpenShiftForm
          storeId={storeId}
          definitions={definitions}
          openingMode={openingMode}
          fixedFloat={fixedFloat}
          lastClosing={lastClosing}
        />

        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" /> Quay lại tổng quan
          </Link>
        </div>
      </div>
    </main>
  );
}
