import { PageHeader } from "@/components/app-shell/page-header";
import { FilterSelect } from "@/components/list/filter-select";
import { SearchInput } from "@/components/list/search-input";
import { ProductList, type ProductRow } from "@/components/products/product-list";
import { parsePage, rangeFor, sanitizeSearch, totalPages } from "@/lib/list-params";
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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q, category, page: pageRaw } = await searchParams;
  const search = sanitizeSearch(q);
  const page = parsePage(pageRaw);

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");
  const categoryFilter =
    category && (categories ?? []).some((c) => c.id === category) ? category : "";

  let query = supabase
    .from("products")
    .select("id, name, sku, image_url, is_active, categories(name), product_variants(price)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  if (categoryFilter) query = query.eq("category_id", categoryFilter);

  const [from, to] = rangeFor(page);
  const { data, count } = await query.range(from, to);

  const products: ProductRow[] = ((data as ProductQueryRow[] | null) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imageUrl: p.image_url,
    isActive: p.is_active,
    categoryName: p.categories?.name ?? null,
    prices: p.product_variants.map((v) => v.price),
  }));

  const categoryOptions = [
    { value: "", label: "Tất cả danh mục" },
    ...((categories ?? []).map((c) => ({ value: c.id, label: c.name }))),
  ];

  return (
    <>
      <PageHeader title="Sản phẩm" description="Quản lý sản phẩm, biến thể và hình ảnh." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Tìm theo tên hoặc SKU…" />
        <FilterSelect paramKey="category" options={categoryOptions} ariaLabel="Lọc danh mục" />
      </div>

      <ProductList
        products={products}
        page={page}
        totalPages={totalPages(count)}
        total={count ?? 0}
        filtered={Boolean(search || categoryFilter)}
      />
    </>
  );
}
