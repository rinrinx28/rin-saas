import { CategoryManager } from "@/components/categories/category-manager";
import { PageHeader } from "@/components/app-shell/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("created_at");

  return (
    <>
      <PageHeader
        title="Danh mục"
        description="Sắp xếp sản phẩm thành nhóm, hỗ trợ danh mục cha — con."
      />
      <CategoryManager categories={categories ?? []} />
    </>
  );
}
