import { redirect } from "next/navigation";
import { StocktakeForm, type StocktakeRow } from "@/components/inventory/stocktake-form";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

interface VariantRow {
  id: string;
  name: string;
  products: { name: string } | null;
}

export default async function StocktakePage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);
  if (!storeId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: variants }, { data: inv }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, name, products(name)")
      .order("created_at", { ascending: false }),
    supabase.from("inventory").select("variant_id, qty").eq("store_id", storeId),
  ]);

  const qtyByVariant = new Map(
    ((inv as { variant_id: string; qty: number }[] | null) ?? []).map((r) => [r.variant_id, r.qty]),
  );
  const rows: StocktakeRow[] = ((variants as VariantRow[] | null) ?? []).map((v) => ({
    variantId: v.id,
    label: `${v.products?.name ?? "?"} — ${v.name}`,
    current: qtyByVariant.get(v.id) ?? 0,
  }));

  return <StocktakeForm storeId={storeId} rows={rows} />;
}
