"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/catalog";

export interface ActionResult {
  error?: string;
}

export async function createProductAction(values: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const supabase = await createClient();
  const p = parsed.data;

  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      org_id: orgId,
      name: p.name,
      sku: p.sku || null,
      category_id: p.categoryId || null,
      image_url: p.imageUrl || null,
      is_active: p.isActive,
    })
    .select("id")
    .single();
  if (pErr || !product) return { error: "Không tạo được sản phẩm" };

  const { error: vErr } = await supabase.from("product_variants").insert(
    p.variants.map((v) => ({
      org_id: orgId,
      product_id: product.id,
      name: v.name,
      barcode: v.barcode || null,
      price: v.price,
      cost: v.cost,
    })),
  );
  if (vErr) {
    // rollback thủ công: xóa product vừa tạo
    await supabase.from("products").delete().eq("id", product.id);
    return { error: "Không tạo được biến thể" };
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const supabase = await createClient();
  const p = parsed.data;

  const { error: pErr } = await supabase
    .from("products")
    .update({
      name: p.name,
      sku: p.sku || null,
      category_id: p.categoryId || null,
      image_url: p.imageUrl || null,
      is_active: p.isActive,
    })
    .eq("id", id);
  if (pErr) return { error: "Không cập nhật được sản phẩm" };

  // Biến thể: update theo id, thêm mới nếu chưa có id (xóa biến thể: để dành)
  for (const v of p.variants) {
    if (v.id) {
      await supabase
        .from("product_variants")
        .update({
          name: v.name,
          barcode: v.barcode || null,
          price: v.price,
          cost: v.cost,
        })
        .eq("id", v.id);
    } else {
      await supabase.from("product_variants").insert({
        org_id: orgId,
        product_id: id,
        name: v.name,
        barcode: v.barcode || null,
        price: v.price,
        cost: v.cost,
      });
    }
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const orgId = await getActiveOrgId();
  if (!orgId || !(await isManager(orgId))) {
    return { error: "Bạn không có quyền xóa sản phẩm" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: "Không xóa được sản phẩm" };

  revalidatePath("/products");
  return {};
}
