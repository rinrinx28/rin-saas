import { notFound, redirect } from "next/navigation";
import {
  ProductForm,
  type ProductFormData,
} from "@/components/products/product-form";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, sku, category_id, image_url, is_active, product_variants(id, name, barcode, price, cost)",
    )
    .eq("id", id)
    .single();
  if (!product) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const formData: ProductFormData = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category_id: product.category_id,
    image_url: product.image_url,
    is_active: product.is_active,
    variants: product.product_variants,
  };

  return (
    <ProductForm
      categories={categories ?? []}
      activeOrgId={orgId}
      product={formData}
    />
  );
}
