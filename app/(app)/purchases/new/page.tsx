import { redirect } from "next/navigation";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

interface VariantQueryRow {
  id: string;
  name: string;
  cost: number;
  products: { name: string } | null;
}

export default async function NewPurchasePage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);
  if (!storeId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: stores }, { data: variants }] = await Promise.all([
    supabase.from("stores").select("id, name").eq("org_id", orgId).order("created_at"),
    supabase
      .from("product_variants")
      .select("id, name, cost, products(name)")
      .order("created_at", { ascending: false }),
  ]);

  const variantOptions = ((variants as VariantQueryRow[] | null) ?? []).map((v) => ({
    id: v.id,
    label: `${v.products?.name ?? "?"} — ${v.name}`,
    cost: v.cost,
  }));

  return (
    <PurchaseForm
      stores={stores ?? []}
      variants={variantOptions}
      activeStoreId={storeId}
    />
  );
}
