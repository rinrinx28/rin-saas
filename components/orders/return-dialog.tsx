"use client";

import { Minus, Plus, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createReturnAction } from "@/app/(app)/orders/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatVnd } from "@/lib/utils";

export interface ReturnableItem {
  id: string; // order_item_id
  name: string;
  qty: number; // đã bán
  price: number;
  returned: number; // đã trả trước đó
}

interface RowState {
  qty: number;
  restock: boolean;
}

export function ReturnDialog({ orderId, items }: { orderId: string; items: ReturnableItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(items.map((it) => [it.id, { qty: 0, restock: true }])),
  );

  const maxOf = (it: ReturnableItem) => it.qty - it.returned;
  const setQty = (id: string, qty: number, max: number) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], qty: Math.min(Math.max(qty, 0), max) } }));
  const toggleRestock = (id: string) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], restock: !r[id].restock } }));

  const refund = useMemo(
    () => items.reduce((s, it) => s + (rows[it.id]?.qty ?? 0) * it.price, 0),
    [items, rows],
  );
  const anySelected = refund > 0;

  async function submit() {
    const payload = items
      .filter((it) => (rows[it.id]?.qty ?? 0) > 0)
      .map((it) => ({ orderItemId: it.id, qty: rows[it.id].qty, restock: rows[it.id].restock }));
    if (payload.length === 0) return;

    setSubmitting(true);
    const res = await createReturnAction({ orderId, items: payload, reason: reason || undefined });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const r = res.result!;
    const parts = [`Trả ${formatVnd(r.subtotal)}`];
    if (r.refund_cash > 0) parts.push(`hoàn tiền ${formatVnd(r.refund_cash)}`);
    if (r.debt_reduced > 0) parts.push(`giảm nợ ${formatVnd(r.debt_reduced)}`);
    toast.success(`${parts.join(" · ")} (${r.code})`);
    setOpen(false);
    setRows(Object.fromEntries(items.map((it) => [it.id, { qty: 0, restock: true }])));
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Undo2 /> Trả hàng
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Trả hàng</DialogTitle>
          <DialogDescription>
            Chọn số lượng từng dòng cần trả. Hàng nhập lại kho mặc định bật; tiền hoàn sẽ trừ
            công nợ trước (nếu đơn còn nợ), phần dư hoàn tiền mặt vào sổ quỹ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((it) => {
            const max = maxOf(it);
            const row = rows[it.id];
            const disabled = max <= 0;
            return (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="tnum text-xs text-fg-muted">
                    {formatVnd(it.price)} · còn trả được {max}
                    {it.returned > 0 && ` (đã trả ${it.returned})`}
                  </p>
                  {!disabled && (
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
                      <input
                        type="checkbox"
                        checked={row.restock}
                        onChange={() => toggleRestock(it.id)}
                        className="accent-primary"
                      />
                      Nhập lại kho
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    aria-label="Giảm"
                    disabled={disabled || row.qty <= 0}
                    onClick={() => setQty(it.id, row.qty - 1, max)}
                  >
                    <Minus />
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Số lượng trả ${it.name}`}
                    value={row.qty || ""}
                    placeholder="0"
                    disabled={disabled}
                    onChange={(e) => setQty(it.id, Number(e.target.value.replace(/\D/g, "")) || 0, max)}
                    className="tnum h-8 w-12 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    aria-label="Tăng"
                    disabled={disabled || row.qty >= max}
                    onClick={() => setQty(it.id, row.qty + 1, max)}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <Input
            placeholder="Lý do trả (tuỳ chọn)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter className="items-center justify-between">
          <span className="text-sm text-fg-muted">
            Hoàn lại:{" "}
            <span className="tnum font-semibold text-primary">{formatVnd(refund)}</span>
          </span>
          <Button onClick={submit} disabled={!anySelected} loading={submitting}>
            Xác nhận trả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
