import { redirect } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return <ProductForm categories={categories ?? []} activeOrgId={orgId} />;
}
