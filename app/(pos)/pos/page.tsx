import { redirect } from "next/navigation";
import { type PosCustomer, type PosProduct, PosScreen } from "@/components/pos/pos-screen";
import { effectiveBank } from "@/lib/payment/bank-qr";
import { getActiveOrgId, getActiveStoreId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

interface VariantRow {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  product_id: string;
  created_at: string;
  products: { name: string; is_active: boolean } | null;
}

export default async function PosPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  const storeId = await getActiveStoreId(orgId);
  if (!storeId) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: variants }, { data: inv }, { data: customers }, { data: org }, { data: store }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select("id, name, price, barcode, product_id, created_at, products(name, is_active)")
        .order("created_at", { ascending: false }),
      supabase.from("inventory").select("variant_id, qty").eq("store_id", storeId),
      supabase.from("customers").select("id, name, phone, points").order("name"),
      supabase
        .from("organizations")
        .select("bank_name, bank_account, bank_holder, loyalty_enabled, loyalty_earn_per_k, loyalty_redeem_value, loyalty_min_redeem")
        .eq("id", orgId)
        .single(),
      supabase.from("stores").select("bank_name, bank_account, bank_holder").eq("id", storeId).single(),
    ]);

  const loyalty = {
    enabled: org?.loyalty_enabled ?? false,
    earnPerK: org?.loyalty_earn_per_k ?? 0,
    redeemValue: org?.loyalty_redeem_value ?? 1000,
    minRedeem: org?.loyalty_min_redeem ?? 0,
  };

  const bank = effectiveBank(
    { name: org?.bank_name ?? null, account: org?.bank_account ?? null, holder: org?.bank_holder ?? null },
    { name: store?.bank_name ?? null, account: store?.bank_account ?? null, holder: store?.bank_holder ?? null },
  );

  const qtyByVariant = new Map(
    ((inv as { variant_id: string; qty: number }[] | null) ?? []).map((r) => [r.variant_id, r.qty]),
  );

  // Gứp biến thể theo sản phẩm gốc (giữ thứ tự sản phẩm theo lần tạo mới nhất).
  const rows = (variants as VariantRow[] | null) ?? [];
  const byProduct = new Map<string, PosProduct>();
  for (const v of rows) {
    if (v.products?.is_active === false) continue;
    let p = byProduct.get(v.product_id);
    if (!p) {
      p = { productId: v.product_id, name: v.products?.name ?? "?", variants: [] };
      byProduct.set(v.product_id, p);
    }
    p.variants.push({
      variantId: v.id,
      name: v.name,
      barcode: v.barcode,
      price: v.price,
      stock: qtyByVariant.get(v.id) ?? 0,
    });
  }
  const products = [...byProduct.values()];

  return (
    <PosScreen
      storeId={storeId}
      products={products}
      customers={(customers as PosCustomer[] | null) ?? []}
      bank={bank}
      loyalty={loyalty}
    />
  );
}
