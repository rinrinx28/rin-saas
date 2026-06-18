"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { promotionSchema } from "@/lib/validations/promotion";

export interface ActionResult {
  error?: string;
}

const NO_PERMISSION = "Bạn không có quyền quản lý khuyến mãi";

export async function createPromotionAction(values: unknown): Promise<ActionResult> {
  const parsed = promotionSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: NO_PERMISSION };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("promotions").insert({
    org_id: orgId,
    name: d.name,
    code: d.code?.trim() ? d.code.trim() : null,
    type: d.type,
    value: d.value,
    min_order: d.minOrder,
    max_discount: d.type === "percent" && d.maxDiscount ? d.maxDiscount : null,
    starts_at: d.startsAt || null,
    ends_at: d.endsAt || null,
    active: d.active,
  });
  if (error) {
    return { error: error.code === "23505" ? "Mã khuyến mãi đã tồn tại" : "Không tạo được khuyến mãi" };
  }

  revalidatePath("/promotions");
  return {};
}

export async function togglePromotionAction(id: string, active: boolean): Promise<ActionResult> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: NO_PERMISSION };

  const supabase = await createClient();
  const { error } = await supabase.from("promotions").update({ active }).eq("id", id);
  if (error) return { error: "Không cập nhật được khuyến mãi" };

  revalidatePath("/promotions");
  return {};
}

export async function deletePromotionAction(id: string): Promise<ActionResult> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: NO_PERMISSION };

  const supabase = await createClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return { error: "Không xoá được khuyến mãi" };

  revalidatePath("/promotions");
  return {};
}
