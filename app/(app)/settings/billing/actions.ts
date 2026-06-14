"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId, isManager } from "@/lib/org";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

// Demo: đổi gói ngay. TODO(VN): tích hợp thanh toán VNPay/MoMo + SePay/Casso để
// kích hoạt gói sau khi đối soát chuyển khoản (Stripe không dùng được ở VN).
export async function updatePlanAction(plan: string): Promise<ActionResult> {
  if (!(plan in PLANS)) return { error: "Gói không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: "Bạn không có quyền đổi gói" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ plan })
    .eq("id", orgId);
  if (error) return { error: "Không đổi được gói" };

  revalidatePath("/settings/billing");
  return {};
}
