import { Plus, Truck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { FilterSelect } from "@/components/list/filter-select";
import { Pagination } from "@/components/list/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parsePage, rangeFor, totalPages } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";
import { formatVnd } from "@/lib/utils";

interface PurchaseRow {
  id: string;
  total: number;
  note: string | null;
  created_at: string;
  stores: { name: string } | null;
  suppliers: { name: string } | null;
  purchase_items: { id: string }[];
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; page?: string }>;
}) {
  const { supplier, page: pageRaw } = await searchParams;
  const page = parsePage(pageRaw);

  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name").order("name");
  const supplierFilter =
    supplier && (suppliers ?? []).some((s) => s.id === supplier) ? supplier : "";

  let query = supabase
    .from("purchase_orders")
    .select("id, total, note, created_at, stores(name), suppliers(name), purchase_items(id)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });
  if (supplierFilter) query = query.eq("supplier_id", supplierFilter);

  const [from, to] = rangeFor(page);
  const { data, count } = await query.range(from, to);
  const rows = (data as PurchaseRow[] | null) ?? [];

  const supplierOptions = [
    { value: "", label: "Tất cả NCC" },
    ...((suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))),
  ];

  return (
    <>
      <PageHeader
        title="Nhập hàng"
        description="Phiếu nhập kho từ nhà cung cấp."
        actions={
          <Button asChild>
            <Link href="/purchases/new">
              <Plus /> Tạo phiếu nhập
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterSelect paramKey="supplier" options={supplierOptions} ariaLabel="Lọc nhà cung cấp" />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
              <Truck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{supplierFilter ? "Không có phiếu phù hợp" : "Chưa có phiếu nhập"}</p>
              <p className="text-sm text-fg-muted">
                {supplierFilter ? "Thử đổi nhà cung cấp." : "Tạo phiếu nhập đầu tiên để cộng tồn kho."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ngày</TableHead>
                  <TableHead>Chi nhánh</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="text-right">Số mặt hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tnum">
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>{r.stores?.name ?? "—"}</TableCell>
                    <TableCell className="text-fg-muted">{r.suppliers?.name ?? "—"}</TableCell>
                    <TableCell className="tnum text-right">{r.purchase_items.length}</TableCell>
                    <TableCell className="tnum text-right font-medium">{formatVnd(r.total)}</TableCell>
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
