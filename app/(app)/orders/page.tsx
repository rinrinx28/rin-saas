import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { FilterSelect } from "@/components/list/filter-select";
import { Pagination } from "@/components/list/pagination";
import { SearchInput } from "@/components/list/search-input";
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
import { parsePage, rangeFor, sanitizeSearch, totalPages } from "@/lib/list-params";
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

const STATUSES = ["completed", "cancelled", "draft"];
const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "draft", label: "Nháp" },
];

const statusBadge: Record<string, React.ReactNode> = {
  completed: <Badge variant="success">Hoàn tất</Badge>,
  cancelled: <Badge variant="danger">Đã hủy</Badge>,
  draft: <Badge variant="info">Nháp</Badge>,
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageRaw } = await searchParams;
  const search = sanitizeSearch(q);
  const page = parsePage(pageRaw);
  const statusFilter = STATUSES.includes(status ?? "") ? status! : "";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, code, created_at, total, status, stores(name), order_items(id)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });
  if (search) query = query.ilike("code", `%${search}%`);
  if (statusFilter) query = query.eq("status", statusFilter);

  const [from, to] = rangeFor(page);
  const { data, count } = await query.range(from, to);
  const rows = (data as OrderRow[] | null) ?? [];
  const hasFilter = Boolean(search || statusFilter);

  return (
    <>
      <PageHeader title="Đơn hàng" description="Lịch sử đơn bán và trạng thái thanh toán." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Tìm mã đơn…" />
        <FilterSelect paramKey="status" options={STATUS_OPTIONS} ariaLabel="Lọc trạng thái" />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
              <ReceiptText className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{hasFilter ? "Không có đơn phù hợp" : "Chưa có đơn hàng"}</p>
              <p className="text-sm text-fg-muted">
                {hasFilter ? "Thử đổi từ khóa hoặc bộ lọc." : "Tạo đơn ở màn Bán hàng (POS)."}
              </p>
            </div>
          </div>
        ) : (
          <>
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
            <Pagination page={page} totalPages={totalPages(count)} total={count ?? 0} />
          </>
        )}
      </Card>
    </>
  );
}
