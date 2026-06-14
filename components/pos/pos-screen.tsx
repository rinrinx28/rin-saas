"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSaleAction } from "@/app/(pos)/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn, formatVnd } from "@/lib/utils";

export interface PosItem {
  variantId: string;
  product: string;
  variant: string;
  barcode: string | null;
  price: number;
  stock: number;
}

interface CartLine {
  variantId: string;
  label: string;
  price: number;
  qty: number;
}

type Method = "cash" | "transfer";

export function PosScreen({ storeId, items }: { storeId: string; items: PosItem[] }) {
  const [stock, setStock] = useState<Record<string, number>>(
    () => Object.fromEntries(items.map((i) => [i.variantId, i.stock])),
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<Method>("cash");
  const [received, setReceived] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ code: string; total: number; change: number } | null>(null);

  // Realtime: tồn kho thay đổi (chi nhánh này) → cập nhật số hiển thị
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`inv-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row = payload.new as { variant_id?: string; qty?: number };
          if (row?.variant_id != null && row.qty != null) {
            setStock((s) => ({ ...s, [row.variant_id as string]: row.qty as number }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [storeId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.product.toLowerCase().includes(q) ||
        i.variant.toLowerCase().includes(q) ||
        (i.barcode ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(subtotal - discount, 0);
  const change = method === "cash" && received ? Math.max(Number(received) - total, 0) : 0;

  function addToCart(item: PosItem) {
    const have = stock[item.variantId] ?? 0;
    if (have <= 0) return;
    setCart((c) => {
      const ex = c.find((l) => l.variantId === item.variantId);
      if (ex) {
        if (ex.qty >= have) return c;
        return c.map((l) => (l.variantId === item.variantId ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...c, { variantId: item.variantId, label: `${item.product} — ${item.variant}`, price: item.price, qty: 1 }];
    });
  }

  function setQty(variantId: string, qty: number) {
    const have = stock[variantId] ?? 0;
    const clamped = Math.max(1, Math.min(qty, have));
    setCart((c) => c.map((l) => (l.variantId === variantId ? { ...l, qty: clamped } : l)));
  }

  function removeLine(variantId: string) {
    setCart((c) => c.filter((l) => l.variantId !== variantId));
  }

  function reset() {
    setCart([]);
    setDiscount(0);
    setReceived("");
    setSuccess(null);
    setError(null);
  }

  async function pay() {
    if (cart.length === 0) return;
    setProcessing(true);
    setError(null);
    const res = await createSaleAction({
      storeId,
      discount,
      method,
      paid: total,
      items: cart.map((l) => ({ variantId: l.variantId, qty: l.qty, price: l.price })),
    });
    setProcessing(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.sale) {
      // trừ tồn cục bộ (realtime cũng sẽ xác nhận)
      setStock((s) => {
        const next = { ...s };
        for (const l of cart) next[l.variantId] = (next[l.variantId] ?? 0) - l.qty;
        return next;
      });
      setSuccess({ code: res.sale.code, total: res.sale.total, change });
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Button variant="ghost" size="icon" aria-label="Quay lại" asChild>
          <Link href="/dashboard">
            <ArrowLeft />
          </Link>
        </Button>
        <ShoppingCart className="size-5 text-primary" />
        <span className="font-display text-lg font-semibold tracking-tight">Bán hàng</span>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_380px]">
        {/* Sản phẩm */}
        <div className="flex flex-col overflow-hidden border-border lg:border-r">
          <div className="relative shrink-0 p-4">
            <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              autoFocus
              placeholder="Tìm sản phẩm theo tên / barcode…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4 pt-0 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const have = stock[item.variantId] ?? 0;
              const out = have <= 0;
              return (
                <button
                  key={item.variantId}
                  type="button"
                  disabled={out}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "flex flex-col rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span className="line-clamp-2 text-sm font-medium">{item.product}</span>
                  <span className="text-xs text-fg-muted">{item.variant}</span>
                  <span className="tnum mt-2 font-semibold text-primary">{formatVnd(item.price)}</span>
                  <span className={cn("tnum text-xs", out ? "text-danger" : "text-fg-subtle")}>
                    Tồn: {have}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-fg-muted">
                Không tìm thấy sản phẩm.
              </p>
            )}
          </div>
        </div>

        {/* Giỏ hàng */}
        <aside className="flex flex-col overflow-hidden bg-surface">
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-fg-muted">Chưa có sản phẩm trong giỏ.</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((l) => (
                  <li key={l.variantId} className="rounded-md border border-border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{l.label}</span>
                      <button
                        type="button"
                        aria-label="Xóa"
                        onClick={() => removeLine(l.variantId)}
                        className="text-fg-subtle hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-7" onClick={() => setQty(l.variantId, l.qty - 1)}>
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="tnum w-8 text-center text-sm">{l.qty}</span>
                        <Button variant="outline" size="icon" className="size-7" onClick={() => setQty(l.variantId, l.qty + 1)}>
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <span className="tnum text-sm font-medium">{formatVnd(l.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Thanh toán */}
          <div className="shrink-0 space-y-3 border-t border-border p-4">
            {error && (
              <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Tạm tính</span>
              <span className="tnum">{formatVnd(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-fg-muted">Chiết khấu</span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="tnum h-8 w-32 text-right"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-medium">Tổng cộng</span>
              <span className="tnum text-xl font-semibold text-primary">{formatVnd(total)}</span>
            </div>

            <div className="flex gap-2">
              {(["cash", "transfer"] as Method[]).map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={method === m ? "primary" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMethod(m)}
                >
                  {m === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                </Button>
              ))}
            </div>
            {method === "cash" && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-fg-muted">Khách đưa</span>
                <Input
                  type="number"
                  min={0}
                  placeholder={String(total)}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  className="tnum h-8 w-32 text-right"
                />
              </div>
            )}
            {method === "cash" && received !== "" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">Tiền thối</span>
                <span className="tnum font-medium">{formatVnd(change)}</span>
              </div>
            )}

            <Button className="w-full" size="lg" loading={processing} disabled={cart.length === 0} onClick={pay}>
              Thu tiền · {formatVnd(total)}
            </Button>
          </div>
        </aside>
      </div>

      {/* Thành công */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(22%_0.01_80/.5)] p-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <p className="mt-3 text-lg font-semibold">Thanh toán thành công</p>
            <p className="text-sm text-fg-muted">Đơn {success.code}</p>
            <p className="tnum mt-3 text-2xl font-semibold">{formatVnd(success.total)}</p>
            {success.change > 0 && (
              <p className="tnum text-sm text-fg-muted">Tiền thối: {formatVnd(success.change)}</p>
            )}
            <Button className="mt-5 w-full" onClick={reset}>
              Bán đơn mới
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
