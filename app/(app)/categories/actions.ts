"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/catalog";

export interface ActionResult {
  error?: string;
}

export async function createCategoryAction(values: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    org_id: orgId,
    name: parsed.data.name,
    parent_id: parsed.data.parentId || null,
  });
  if (error) return { error: "Không tạo được danh mục" };

  revalidatePath("/categories");
  return {};
}

export async function updateCategoryAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };
  if (parsed.data.parentId === id) {
    return { error: "Danh mục không thể là cha của chính nó" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, parent_id: parsed.data.parentId || null })
    .eq("id", id);
  if (error) return { error: "Không cập nhật được danh mục" };

  revalidatePath("/categories");
  return {};
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Không xóa được danh mục" };

  revalidatePath("/categories");
  return {};
}
