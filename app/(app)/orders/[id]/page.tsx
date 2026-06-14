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
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";

interface OrderDetail {
  id: string;
  code: string;
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
    qty: number;
    price: number;
    total: number;
    product_variants: { name: string; products: { name: string } | null } | null;
  }[];
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
      "id, code, created_at, subtotal, discount, total, paid, status, stores(name, address), customers(name, phone), payments(method, amount), order_items(qty, price, total, product_variants(name, products(name)))",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const order = data as unknown as OrderDetail;

  const { data: ei } = await supabase
    .from("einvoices")
    .select("status, series, invoice_no, tax_authority_code, lookup_url, issued_at")
    .eq("order_id", id)
    .eq("status", "issued")
    .maybeSingle();
  const einvoice = (ei as EInvoiceRecord | null) ?? null;

  const orgId = await getActiveOrgId();
  const canManage = orgId ? await isManager(orgId) : false;

  const methodLabel = order.payments[0]
    ? order.payments[0].method === "cash"
      ? "Tiền mặt"
      : "Chuyển khoản"
    : "—";

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
        <Button asChild>
          <a href={`/print/order/${order.id}`} target="_blank" rel="noopener noreferrer">
            <Printer /> In hóa đơn
          </a>
        </Button>
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
              <Row label="Trạng thái" value={<Badge variant="success">Hoàn tất</Badge>} />
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
          <EInvoicePanel orderId={order.id} einvoice={einvoice} canManage={canManage} />
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
