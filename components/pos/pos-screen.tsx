"use client";

import {
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Tag,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelTransferOrderAction,
  checkOrderPaidAction,
  confirmTransferPaidAction,
  createSaleAction,
  createTransferOrderAction,
} from "@/app/(pos)/pos/actions";
import { CustomerCombobox, type PosCustomer } from "@/components/pos/customer-combobox";
import { SuccessCheck } from "@/components/pos/success-check";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { type BankInfo, buildBankQrUrl, hasBank, transferMemo } from "@/lib/payment/bank-qr";
import { createClient } from "@/lib/supabase/client";
import { cn, formatVnd } from "@/lib/utils";

export type { PosCustomer } from "@/components/pos/customer-combobox";

export interface PosVariant {
  variantId: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
}
export interface PosProduct {
  productId: string;
  name: string;
  variants: PosVariant[];
}

interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  price: number;
  qty: number;
}

type Method = "cash" | "transfer" | "vnpay" | "momo";

const METHOD_LABEL: Record<Method, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
};
const METHODS = Object.keys(METHOD_LABEL) as Method[];

export function PosScreen({
  storeId,
  products,
  customers,
  bank,
}: {
  storeId: string;
  products: PosProduct[];
  customers: PosCustomer[];
  bank: BankInfo;
}) {
  const toast = useToast();
  const [stock, setStock] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.flatMap((p) => p.variants.map((v) => [v.variantId, v.stock]))),
  );
  const [customerList, setCustomerList] = useState<PosCustomer[]>(customers);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promo, setPromo] = useState("");
  const [method, setMethod] = useState<Method>("cash");
  const [customerId, setCustomerId] = useState("");
  const [paidStr, setPaidStr] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{ code: string; total: number; change: number; debt: number } | null>(null);
  const [pending, setPending] = useState<{ orderId: string; code: string; total: number } | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  // Chọn biến thể: product = sản phẩm đang chọn; lineVariantId != null = đổi biến thể cho dòng giỏ.
  const [picker, setPicker] = useState<{ product: PosProduct; lineVariantId?: string } | null>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.productId, p])), [products]);

  // Realtime: tồn kho thay đổi (chi nhánh này) → cập nhật số hiển thị.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      ch = supabase
        .channel(`inv-${storeId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "inventory", filter: `store_id=eq.${storeId}` },
          (payload) => {
            const row = payload.new as { variant_id?: string; qty?: number };
            if (active && row?.variant_id != null && row.qty != null) {
              setStock((s) => ({ ...s, [row.variant_id as string]: row.qty as number }));
            }
          },
        )
        .subscribe();
    })();
    return () => {
      active = false;
      if (ch) supabase.removeChannel(ch);
    };
  }, [storeId]);

  // Đơn chờ chuyển khoản: realtime (orders) + poll fallback → tiền về thì báo thành công.
  useEffect(() => {
    if (!pending) return;
    let active = true;
    const supabase = createClient();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    const markPaid = () => {
      if (!active) return;
      setSuccess({ code: pending.code, total: pending.total, change: 0, debt: 0 });
      setPending(null);
    };
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      ch = supabase
        .channel(`order-${pending.orderId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${pending.orderId}` },
          (payload) => {
            const row = payload.new as { paid?: number };
            if ((row?.paid ?? 0) >= pending.total) markPaid();
          },
        )
        .subscribe();
    })();
    const poll = setInterval(async () => {
      const r = await checkOrderPaidAction(pending.orderId);
      if (r && r.paid >= r.total) markPaid();
    }, 4000);
    return () => {
      active = false;
      clearInterval(poll);
      if (ch) supabase.removeChannel(ch);
    };
  }, [pending]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some(
          (v) => v.name.toLowerCase().includes(q) || (v.barcode ?? "").toLowerCase().includes(q),
        ),
    );
  }, [products, search]);

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(subtotal - discount, 0);
  const paidEntered = paidStr === "" ? total : Math.max(Number(paidStr) || 0, 0);
  const paidToOrder = Math.min(paidEntered, total);
  const debt = total - paidToOrder;
  const change = Math.max(paidEntered - total, 0);
  const canCash = cart.length > 0 && (debt === 0 || customerId !== "");
  const canTransfer = cart.length > 0 && hasBank(bank);

  function addVariant(line: { productId: string; productName: string }, v: PosVariant) {
    const have = stock[v.variantId] ?? 0;
    if (have <= 0) return;
    setCart((c) => {
      const ex = c.find((l) => l.variantId === v.variantId);
      if (ex) {
        if (ex.qty >= have) return c;
        return c.map((l) => (l.variantId === v.variantId ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...c,
        {
          variantId: v.variantId,
          productId: line.productId,
          productName: line.productName,
          variantName: v.name,
          price: v.price,
          qty: 1,
        },
      ];
    });
  }

  function addProduct(p: PosProduct) {
    const inStock = p.variants.filter((v) => (stock[v.variantId] ?? 0) > 0);
    if (inStock.length === 0) return;
    if (p.variants.length === 1) {
      addVariant({ productId: p.productId, productName: p.name }, p.variants[0]);
      return;
    }
    setPicker({ product: p });
  }

  function onPickVariant(v: PosVariant) {
    if (!picker) return;
    if (picker.lineVariantId) changeLineVariant(picker.lineVariantId, v);
    else addVariant({ productId: picker.product.productId, productName: picker.product.name }, v);
    setPicker(null);
  }

  function changeLineVariant(oldVariantId: string, v: PosVariant) {
    if (oldVariantId === v.variantId) return;
    const have = stock[v.variantId] ?? 0;
    setCart((c) => {
      const old = c.find((l) => l.variantId === oldVariantId);
      if (!old) return c;
      const existing = c.find((l) => l.variantId === v.variantId);
      if (existing) {
        const merged = Math.min(existing.qty + old.qty, have);
        return c
          .filter((l) => l.variantId !== oldVariantId)
          .map((l) => (l.variantId === v.variantId ? { ...l, qty: merged } : l));
      }
      return c.map((l) =>
        l.variantId === oldVariantId
          ? { ...l, variantId: v.variantId, variantName: v.name, price: v.price, qty: Math.max(1, Math.min(old.qty, have)) }
          : l,
      );
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

  const reset = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setPromo("");
    setPaidStr("");
    setCustomerId("");
    setSuccess(null);
  }, []);

  // Dialog thành công tự tắt sau 3s (vẫn có nút đóng tay).
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(reset, 3000);
    return () => clearTimeout(t);
  }, [success, reset]);

  async function pay() {
    if (!canCash) return;
    setProcessing(true);
    const res = await createSaleAction({
      storeId,
      customerId: customerId || undefined,
      discount,
      method,
      paid: paidToOrder,
      items: cart.map((l) => ({ variantId: l.variantId, qty: l.qty, price: l.price })),
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.sale) {
      setStock((s) => {
        const next = { ...s };
        for (const l of cart) next[l.variantId] = (next[l.variantId] ?? 0) - l.qty;
        return next;
      });
      setSuccess({ code: res.sale.code, total: res.sale.total, change, debt });
    }
  }

  async function payByTransfer() {
    if (!canTransfer) return;
    setProcessing(true);
    const res = await createTransferOrderAction({
      storeId,
      customerId: customerId || undefined,
      discount,
      items: cart.map((l) => ({ variantId: l.variantId, qty: l.qty, price: l.price })),
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.sale) {
      setStock((s) => {
        const next = { ...s };
        for (const l of cart) next[l.variantId] = (next[l.variantId] ?? 0) - l.qty;
        return next;
      });
      setPending({ orderId: res.sale.id, code: res.sale.code, total: res.sale.total });
    }
  }

  async function confirmPendingManual() {
    if (!pending) return;
    setPendingBusy(true);
    const res = await confirmTransferPaidAction(pending.orderId);
    setPendingBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSuccess({ code: pending.code, total: pending.total, change: 0, debt: 0 });
    setPending(null);
  }

  async function cancelPending() {
    if (!pending) return;
    setPendingBusy(true);
    const res = await cancelTransferOrderAction(pending.orderId);
    setPendingBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setStock((s) => {
      const next = { ...s };
      for (const l of cart) next[l.variantId] = (next[l.variantId] ?? 0) + l.qty;
      return next;
    });
    setPending(null);
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
            {filtered.map((p) => {
              const totalStock = p.variants.reduce((s, v) => s + (stock[v.variantId] ?? 0), 0);
              const out = totalStock <= 0;
              const prices = p.variants.map((v) => v.price);
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              const priceLabel = min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`;
              return (
                <button
                  key={p.productId}
                  type="button"
                  disabled={out}
                  onClick={() => addProduct(p)}
                  className="flex flex-col rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                  {p.variants.length > 1 ? (
                    <span className="text-xs text-fg-muted">{p.variants.length} biến thể</span>
                  ) : (
                    <span className="text-xs text-fg-muted">{p.variants[0].name}</span>
                  )}
                  <span className="tnum mt-2 font-semibold text-primary">{priceLabel}</span>
                  <span className={cn("tnum text-xs", out ? "text-danger" : "text-fg-subtle")}>
                    Tồn: {totalStock}
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
                {cart.map((l) => {
                  const product = productById.get(l.productId);
                  const multiVariant = (product?.variants.length ?? 0) > 1;
                  return (
                    <li key={l.variantId} className="rounded-md border border-border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{l.productName}</span>
                        <button
                          type="button"
                          aria-label="Xóa"
                          onClick={() => removeLine(l.variantId)}
                          className="text-fg-subtle hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {/* Chip biến thể — bấm để đổi nếu sản phẩm có nhiều biến thể */}
                      <button
                        type="button"
                        disabled={!multiVariant}
                        onClick={() => product && setPicker({ product, lineVariantId: l.variantId })}
                        className={cn(
                          "mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-fg-muted",
                          multiVariant && "transition-colors hover:border-primary hover:text-fg",
                        )}
                      >
                        <Tag className="size-3" />
                        {l.variantName}
                        {multiVariant && <Plus className="size-3" />}
                      </button>
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
                  );
                })}
              </ul>
            )}
          </div>

          {/* Thanh toán */}
          <div className="shrink-0 space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Tạm tính</span>
              <span className="tnum">{formatVnd(subtotal)}</span>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm text-fg-muted">Chiết khấu</span>
              <MoneyInput id="pos-discount" suggest value={discount} onChange={setDiscount} />
            </div>

            {/* Mã khuyến mãi (UI — tính năng sẽ bổ sung sau) */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                <Input
                  placeholder="Mã khuyến mãi"
                  className="h-9 pl-9"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info("Tính năng khuyến mãi sắp ra mắt")}
              >
                Áp dụng
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-medium">Tổng cộng</span>
              <span className="tnum text-xl font-semibold text-primary">{formatVnd(total)}</span>
            </div>

            <CustomerCombobox
              customers={customerList}
              value={customerId}
              onChange={setCustomerId}
              onCreated={(c) => setCustomerList((list) => [c, ...list])}
            />

            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={method === m ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setMethod(m)}
                >
                  {METHOD_LABEL[m]}
                </Button>
              ))}
            </div>

            {method === "transfer" &&
              (hasBank(bank) ? (
                <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
                  Khách quét mã QR để chuyển khoản. Hệ thống tự động xác nhận đơn ngay khi nhận được tiền.
                </p>
              ) : (
                <p className="rounded-md border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
                  Chưa cấu hình tài khoản nhận tiền.{" "}
                  <Link href="/settings" className="underline">
                    Cài đặt
                  </Link>
                </p>
              ))}

            {(method === "vnpay" || method === "momo") && (
              <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
                Cổng {METHOD_LABEL[method]} đang ở chế độ adapter (chưa cấu hình merchant) — ghi nhận
                thủ công khi nhận được tiền.
              </p>
            )}

            {method !== "transfer" && (
              <>
                <div className="space-y-1.5">
                  <span className="text-sm text-fg-muted">Tiền khách trả</span>
                  <MoneyInput
                    id="pos-paid"
                    suggest
                    placeholder={total.toLocaleString("vi-VN")}
                    value={paidStr === "" ? 0 : Number(paidStr)}
                    onChange={(n) => setPaidStr(n === 0 ? "" : String(n))}
                  />
                </div>
                {change > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-fg-muted">Tiền thối</span>
                    <span className="tnum font-medium">{formatVnd(change)}</span>
                  </div>
                )}
                {debt > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-danger">Ghi nợ</span>
                    <span className="tnum font-medium text-danger">{formatVnd(debt)}</span>
                  </div>
                )}
                {debt > 0 && customerId === "" && (
                  <p className="text-xs text-warning">Chọn khách hàng để ghi nợ phần còn thiếu.</p>
                )}
              </>
            )}

            {method === "transfer" ? (
              <Button className="w-full" size="lg" loading={processing} disabled={!canTransfer} onClick={payByTransfer}>
                <QrCode className="size-4" /> Tạo QR · {formatVnd(total)}
              </Button>
            ) : (
              <Button className="w-full" size="lg" loading={processing} disabled={!canCash} onClick={pay}>
                Thu tiền · {formatVnd(total)}
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* Chọn biến thể */}
      <Dialog open={picker !== null} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{picker?.product.name}</DialogTitle>
            <DialogDescription>Chọn biến thể để thêm vào giỏ.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {picker?.product.variants.map((v) => {
              const have = stock[v.variantId] ?? 0;
              const out = have <= 0;
              return (
                <button
                  key={v.variantId}
                  type="button"
                  disabled={out}
                  onClick={() => onPickVariant(v)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-sm font-medium">{v.name}</span>
                  <span className="tnum text-sm text-fg-muted">
                    {formatVnd(v.price)} · Tồn {have}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Đơn chờ chuyển khoản */}
      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[oklch(22%_0.01_80/.5)] p-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-lg animate-[pop-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <p className="font-display text-lg font-semibold tracking-tight">Quét QR để thanh toán</p>
            <p className="tnum text-sm text-fg-muted">
              Đơn {pending.code} · {formatVnd(pending.total)}
            </p>
            {hasBank(bank) && (
              <div className="mt-4 flex justify-center">
                <Image
                  src={buildBankQrUrl(bank, pending.total, transferMemo(pending.code))!}
                  alt="QR chuyển khoản"
                  width={220}
                  height={220}
                  className="rounded-lg border border-border"
                  unoptimized
                />
              </div>
            )}
            <div className="mt-3 space-y-0.5 text-xs text-fg-muted">
              <p>
                {bank.name} · <span className="tnum">{bank.account}</span>
              </p>
              <p>
                Nội dung: <span className="font-medium text-fg">{transferMemo(pending.code)}</span>
              </p>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-fg-muted">
              <Loader2 className="size-4 animate-spin" /> Đang chờ tiền về…
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={pendingBusy} onClick={cancelPending}>
                Huỷ đơn
              </Button>
              <Button className="flex-1" loading={pendingBusy} onClick={confirmPendingManual}>
                Đã nhận tiền
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Thành công */}
      {success && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[oklch(22%_0.01_80/.5)] p-6">
          <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface p-6 text-center shadow-lg animate-[pop-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <button
              type="button"
              aria-label="Đóng"
              onClick={reset}
              className="absolute right-3 top-3 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
            <SuccessCheck />
            <p className="mt-4 text-lg font-semibold">Thanh toán thành công</p>
            <p className="text-sm text-fg-muted">Đơn {success.code}</p>
            <p className="tnum mt-2 text-2xl font-semibold">{formatVnd(success.total)}</p>
            {success.change > 0 && (
              <p className="tnum text-sm text-fg-muted">Tiền thối: {formatVnd(success.change)}</p>
            )}
            {success.debt > 0 && (
              <p className="tnum text-sm text-danger">Ghi nợ: {formatVnd(success.debt)}</p>
            )}
            <p className="mt-3 text-sm text-fg-muted">Cảm ơn quý khách, hẹn gặp lại!</p>
          </div>
        </div>
      )}
    </div>
  );
}
