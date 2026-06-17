import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EInvoicePanel, type EInvoiceRecord } from "@/components/orders/einvoice-panel";
import { PaymentQrCard } from "@/components/orders/payment-qr-card";
import { ReturnDialog } from "@/components/orders/return-dialog";
import { effectiveBank } from "@/lib/payment/bank-qr";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
};

interface OrderDetail {
  id: string;
  code: string;
  store_id: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  status: string;
  stores: { name: string; address: string | null } | null;
  customers: { name: string; phone: string | null } | null;
  payments: { method: string; amount: number }[];
  order_items: {
    id: string;
    qty: number;
    price: number;
    total: number;
    product_variants: { name: string; products: { name: string } | null } | null;
  }[];
}

interface ReturnRecord {
  id: string;
  code: string;
  subtotal: number;
  refund_cash: number;
  debt_reduced: number;
  created_at: string;
  return_items: { order_item_id: string; qty: number }[];
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, store_id, created_at, subtotal, discount, total, paid, status, stores(name, address), customers(name, phone), payments(method, amount), order_items(id, qty, price, total, product_variants(name, products(name)))",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const order = data as unknown as OrderDetail;

  // Lịch sử trả hàng của đơn → số đã trả từng dòng + bảng phiếu trả.
  const { data: returnsData } = await supabase
    .from("return_orders")
    .select("id, code, subtotal, refund_cash, debt_reduced, created_at, return_items(order_item_id, qty)")
    .eq("order_id", id)
    .order("created_at", { ascending: false });
  const returns = (returnsData as ReturnRecord[] | null) ?? [];
  const returnedByItem = new Map<string, number>();
  for (const ro of returns) {
    for (const ri of ro.return_items) {
      returnedByItem.set(ri.order_item_id, (returnedByItem.get(ri.order_item_id) ?? 0) + ri.qty);
    }
  }
  const returnableItems = order.order_items
    .map((it) => ({
      id: it.id,
      name: `${it.product_variants?.products?.name ?? "?"} — ${it.product_variants?.name ?? ""}`,
      qty: it.qty,
      price: it.price,
      returned: returnedByItem.get(it.id) ?? 0,
    }))
    .filter((it) => it.qty - it.returned > 0);
  const canReturn = order.status === "completed" && returnableItems.length > 0;

  const { data: ei } = await supabase
    .from("einvoices")
    .select("status, series, invoice_no, tax_authority_code, lookup_url, issued_at")
    .eq("order_id", id)
    .eq("status", "issued")
    .maybeSingle();
  const einvoice = (ei as EInvoiceRecord | null) ?? null;

  const orgId = await getActiveOrgId();
  const canManage = orgId ? await isManager(orgId) : false;

  // Tài khoản nhận tiền hiệu lực (chi nhánh ghi đè cửa hàng) → QR chuyển khoản.
  const [{ data: orgBank }, { data: storeBank }] = await Promise.all([
    orgId
      ? supabase.from("organizations").select("bank_name, bank_account, bank_holder").eq("id", orgId).single()
      : Promise.resolve({ data: null }),
    supabase.from("stores").select("bank_name, bank_account, bank_holder").eq("id", order.store_id).single(),
  ]);
  const bank = effectiveBank(
    { name: orgBank?.bank_name ?? null, account: orgBank?.bank_account ?? null, holder: orgBank?.bank_holder ?? null },
    { name: storeBank?.bank_name ?? null, account: storeBank?.bank_account ?? null, holder: storeBank?.bank_holder ?? null },
  );
  const remaining = Math.max(order.total - order.paid, 0);
  const qrAmount = remaining > 0 ? remaining : order.total;

  const methodLabel = order.payments[0]
    ? (METHOD_LABEL[order.payments[0].method] ?? order.payments[0].method)
    : "—";

  const statusBadge =
    order.status === "cancelled" ? (
      <Badge variant="danger">Đã huỷ</Badge>
    ) : order.status === "draft" ? (
      <Badge variant="neutral">Chờ thanh toán</Badge>
    ) : returns.length > 0 ? (
      <Badge variant="warning">Đã trả một phần</Badge>
    ) : (
      <Badge variant="success">Hoàn tất</Badge>
    );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Quay lại" asChild>
            <Link href="/orders">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="tnum font-display text-2xl font-semibold tracking-tight">
              {order.code}
            </h1>
            <p className="text-sm text-fg-muted">
              {new Date(order.created_at).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canReturn && <ReturnDialog orderId={order.id} items={returnableItems} />}
          <Button asChild>
            <a href={`/print/order/${order.id}`} target="_blank" rel="noopener noreferrer">
              <Printer /> In hóa đơn
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">SL</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {it.product_variants?.products?.name ?? "?"}
                      <span className="text-fg-muted"> — {it.product_variants?.name}</span>
                    </TableCell>
                    <TableCell className="tnum text-right">{it.qty}</TableCell>
                    <TableCell className="tnum text-right">{formatVnd(it.price)}</TableCell>
                    <TableCell className="tnum text-right">{formatVnd(it.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <Row label="Trạng thái" value={statusBadge} />
              <Row label="Chi nhánh" value={order.stores?.name ?? "—"} />
              <Row label="Khách hàng" value={order.customers?.name ?? "Khách lẻ"} />
              <Row label="Thanh toán" value={methodLabel} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <Row label="Tạm tính" value={<span className="tnum">{formatVnd(order.subtotal)}</span>} />
              <Row label="Chiết khấu" value={<span className="tnum">{formatVnd(order.discount)}</span>} />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-medium">Tổng cộng</span>
                <span className="tnum text-lg font-semibold text-primary">{formatVnd(order.total)}</span>
              </div>
              <Row label="Đã trả" value={<span className="tnum">{formatVnd(order.paid)}</span>} />
            </CardContent>
          </Card>
          {returns.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-5 text-sm">
                <p className="font-medium">Phiếu trả hàng</p>
                {returns.map((ro) => (
                  <div key={ro.id} className="flex items-center justify-between border-t border-border pt-2 first:border-0 first:pt-0">
                    <div>
                      <p className="tnum font-medium">{ro.code}</p>
                      <p className="text-xs text-fg-muted">
                        {new Date(ro.created_at).toLocaleString("vi-VN")}
                        {ro.debt_reduced > 0 && ` · giảm nợ ${formatVnd(ro.debt_reduced)}`}
                        {ro.refund_cash > 0 && ` · hoàn ${formatVnd(ro.refund_cash)}`}
                      </p>
                    </div>
                    <span className="tnum font-medium text-danger">−{formatVnd(ro.subtotal)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <EInvoicePanel orderId={order.id} einvoice={einvoice} canManage={canManage} />
          <PaymentQrCard bank={bank} amount={qrAmount} orderCode={order.code} />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
