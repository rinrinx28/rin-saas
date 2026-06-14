import { Boxes } from "lucide-react";
import { redirect } from "next/navigation";
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
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

interface VariantRow {
  id: string;
  name: string;
  products: { name: string } | null;
}

function stockBadge(qty: number) {
  if (qty <= 0) return <Badge variant="danger">Hết hàng</Badge>;
  if (qty <= 5) return <Badge variant="warning">Sắp hết</Badge>;
  return <Badge variant="success">Còn hàng</Badge>;
}

export default async function InventoryPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);

  const supabase = await createClient();
  const [{ data: variants }, { data: inv }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, name, products(name)")
      .order("created_at", { ascending: false }),
    storeId
      ? supabase.from("inventory").select("variant_id, qty").eq("store_id", storeId)
      : Promise.resolve({ data: [] as { variant_id: string; qty: number }[] }),
  ]);

  const qtyByVariant = new Map(
    ((inv as { variant_id: string; qty: number }[] | null) ?? []).map((r) => [
      r.variant_id,
      r.qty,
    ]),
  );
  const rows = ((variants as VariantRow[] | null) ?? []).map((v) => ({
    id: v.id,
    product: v.products?.name ?? "?",
    variant: v.name,
    qty: qtyByVariant.get(v.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="Số lượng tồn theo chi nhánh đang chọn."
      />
      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
              <Boxes className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Chưa có sản phẩm</p>
              <p className="text-sm text-fg-muted">Tạo sản phẩm và nhập hàng để theo dõi tồn.</p>
            </div>
          </div>
        ) : (
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
        )}
      </Card>
    </>
  );
}
