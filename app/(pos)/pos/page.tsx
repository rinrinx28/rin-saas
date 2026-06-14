import { redirect } from "next/navigation";
import { PosScreen, type PosItem } from "@/components/pos/pos-screen";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

interface VariantRow {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  products: { name: string; is_active: boolean } | null;
}

export default async function PosPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);
  if (!storeId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: variants }, { data: inv }, { data: customers }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, name, price, barcode, products(name, is_active)")
      .order("created_at", { ascending: false }),
    supabase.from("inventory").select("variant_id, qty").eq("store_id", storeId),
    supabase.from("customers").select("id, name").order("name"),
  ]);

  const qtyByVariant = new Map(
    ((inv as { variant_id: string; qty: number }[] | null) ?? []).map((r) => [
      r.variant_id,
      r.qty,
    ]),
  );

  const items: PosItem[] = ((variants as VariantRow[] | null) ?? [])
    .filter((v) => v.products?.is_active !== false)
    .map((v) => ({
      variantId: v.id,
      product: v.products?.name ?? "?",
      variant: v.name,
      barcode: v.barcode,
      price: v.price,
      stock: qtyByVariant.get(v.id) ?? 0,
    }));

  return (
    <PosScreen
      storeId={storeId}
      items={items}
      customers={customers ?? []}
    />
  );
}
