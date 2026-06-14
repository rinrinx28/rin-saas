import { Boxes, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { FilterSelect } from "@/components/list/filter-select";
import { Pagination } from "@/components/list/pagination";
import { SearchInput } from "@/components/list/search-input";
import { Badge } from "@/components/ui/badge";
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
import { parsePage, rangeFor, sanitizeSearch, totalPages } from "@/lib/list-params";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

// Ngưỡng "sắp hết" của trang tồn kho (khớp badge bên dưới).
const LOW_STOCK = 5;

const STOCK_OPTIONS = [
  { value: "", label: "Tất cả tồn" },
  { value: "low", label: "Sắp hết" },
  { value: "out", label: "Hết hàng" },
];

interface VariantRow {
  id: string;
  name: string;
  products: { name: string } | null;
  inventory: { qty: number }[];
}

function stockBadge(qty: number) {
  if (qty <= 0) return <Badge variant="danger">Hết hàng</Badge>;
  if (qty <= LOW_STOCK) return <Badge variant="warning">Sắp hết</Badge>;
  return <Badge variant="success">Còn hàng</Badge>;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string; page?: string }>;
}) {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);

  const { q, stock, page: pageRaw } = await searchParams;
  const search = sanitizeSearch(q);
  const page = parsePage(pageRaw);
  const stockFilter = stock === "low" || stock === "out" ? stock : "";
  const useInner = stockFilter !== "";
  const hasFilter = Boolean(search || stockFilter);

  const supabase = await createClient();
  const invJoin = useInner ? "inventory!inner(qty)" : "inventory(qty)";

  let rows: { id: string; product: string; variant: string; qty: number }[] = [];
  let count = 0;

  if (storeId) {
    let query = supabase
      .from("product_variants")
      .select(`id, name, products!inner(name), ${invJoin}`, { count: "exact" })
      .eq("inventory.store_id", storeId)
      .order("created_at", { ascending: false });
    if (search) query = query.ilike("products.name", `%${search}%`);
    if (stockFilter === "low") query = query.gte("inventory.qty", 1).lte("inventory.qty", LOW_STOCK);
    if (stockFilter === "out") query = query.eq("inventory.qty", 0);

    const [from, to] = rangeFor(page);
    const res = await query.range(from, to);
    count = res.count ?? 0;
    rows = ((res.data as VariantRow[] | null) ?? []).map((v) => ({
      id: v.id,
      product: v.products?.name ?? "?",
      variant: v.name,
      qty: v.inventory?.[0]?.qty ?? 0,
    }));
  }

  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="Số lượng tồn theo chi nhánh đang chọn."
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/stocktake">
              <ClipboardCheck /> Kiểm kho
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Tìm theo tên sản phẩm…" />
        <FilterSelect paramKey="stock" options={STOCK_OPTIONS} ariaLabel="Lọc tồn kho" />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
              <Boxes className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{hasFilter ? "Không có mặt hàng phù hợp" : "Chưa có sản phẩm"}</p>
              <p className="text-sm text-fg-muted">
                {hasFilter ? "Thử đổi từ khóa hoặc bộ lọc." : "Tạo sản phẩm và nhập hàng để theo dõi tồn."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Biến thể</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.product}</TableCell>
                    <TableCell className="text-fg-muted">{r.variant}</TableCell>
                    <TableCell className="text-center">{stockBadge(r.qty)}</TableCell>
                    <TableCell className="tnum text-right">{r.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages(count)} total={count} />
          </>
        )}
      </Card>
    </>
  );
}
