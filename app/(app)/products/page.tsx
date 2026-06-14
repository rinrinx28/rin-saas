import { PageHeader } from "@/components/app-shell/page-header";
import { ProductList, type ProductRow } from "@/components/products/product-list";
import { createClient } from "@/lib/supabase/server";

interface ProductQueryRow {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  categories: { name: string } | null;
  product_variants: { price: number }[];
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, image_url, is_active, categories(name), product_variants(price)")
    .order("created_at", { ascending: false });

  const products: ProductRow[] = ((data as ProductQueryRow[] | null) ?? []).map(
    (p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      imageUrl: p.image_url,
      isActive: p.is_active,
      categoryName: p.categories?.name ?? null,
      prices: p.product_variants.map((v) => v.price),
    }),
  );

  return (
    <>
      <PageHeader
        title="Sản phẩm"
        description="Quản lý sản phẩm, biến thể và hình ảnh."
      />
      <ProductList products={products} />
    </>
  );
}
