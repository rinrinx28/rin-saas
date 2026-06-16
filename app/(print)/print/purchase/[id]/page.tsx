import { notFound } from "next/navigation";
import { StockReceipt, type StockReceiptData } from "@/components/invoice/stock-receipt";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_UNIT = "Cái";

interface PurchaseQuery {
  note: string | null;
  total: number;
  created_at: string;
  organizations: { name: string } | null;
  stores: { name: string; address: string | null } | null;
  suppliers: { name: string } | null;
  purchase_items: {
    qty: number;
    cost: number;
    total: number;
    product_variants: {
      name: string;
      barcode: string | null;
      products: { name: string; sku: string | null } | null;
    } | null;
  }[];
}

// Số phiếu nhập kho — dẫn xuất ổn định từ id + ngày (purchase_orders không có code).
function receiptNo(id: string, createdAt: string): string {
  const dt = new Date(createdAt);
  const ymd =
    String(dt.getFullYear()).slice(-2) +
    String(dt.getMonth() + 1).padStart(2, "0") +
    String(dt.getDate()).padStart(2, "0");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `PNK${ymd}-${String(h % 100000).padStart(5, "0")}`;
}

export default async function PrintPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select(
      "note, total, created_at, organizations(name), stores(name, address), suppliers(name), purchase_items(qty, cost, total, product_variants(name, barcode, products(name, sku)))",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const p = data as unknown as PurchaseQuery;

  const receipt: StockReceiptData = {
    orgName: p.organizations?.name ?? "Cửa hàng",
    storeName: p.stores?.name ?? "",
    storeAddress: p.stores?.address ?? null,
    receiptNo: receiptNo(id, p.created_at),
    createdAt: p.created_at,
    supplierName: p.suppliers?.name ?? null,
    note: p.note,
    total: p.total,
    items: p.purchase_items.map((it) => ({
      name: `${it.product_variants?.products?.name ?? "?"} — ${it.product_variants?.name ?? ""}`,
      code: it.product_variants?.barcode ?? it.product_variants?.products?.sku ?? "",
      unit: DEFAULT_UNIT,
      qty: it.qty,
      cost: it.cost,
      total: it.total,
    })),
  };

  return <StockReceipt data={receipt} />;
}
