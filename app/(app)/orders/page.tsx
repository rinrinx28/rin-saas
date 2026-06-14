import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";

interface OrderRow {
  id: string;
  code: string;
  created_at: string;
  total: number;
  status: string;
  stores: { name: string } | null;
  order_items: { id: string }[];
}

const statusBadge: Record<string, React.ReactNode> = {
  completed: <Badge variant="success">Hoàn tất</Badge>,
  cancelled: <Badge variant="danger">Đã hủy</Badge>,
  draft: <Badge variant="info">Nháp</Badge>,
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, code, created_at, total, status, stores(name), order_items(id)")
    .order("created_at", { ascending: false });
  const rows = (data as OrderRow[] | null) ?? [];

  return (
    <>
      <PageHeader title="Đơn hàng" description="Lịch sử bán hàng." />
      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
              <ReceiptText className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Chưa có đơn hàng</p>
              <p className="text-sm text-fg-muted">Tạo đơn ở màn Bán hàng (POS).</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mã đơn</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead className="text-right">Số mặt hàng</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/orders/${r.id}`} className="tnum font-medium text-primary hover:underline">
                      {r.code}
                    </Link>
                  </TableCell>
                  <TableCell className="tnum text-fg-muted">
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>{r.stores?.name ?? "—"}</TableCell>
                  <TableCell className="tnum text-right">{r.order_items.length}</TableCell>
                  <TableCell className="tnum text-right font-medium">{formatVnd(r.total)}</TableCell>
                  <TableCell className="text-center">{statusBadge[r.status] ?? r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
