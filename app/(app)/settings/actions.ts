"use server";

import { revalidatePath } from "next/cache";
import { checkLimit } from "@/lib/limits";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { bankSchema, orgSchema, storeSchema } from "@/lib/validations/settings";

export interface ActionResult {
  error?: string;
}

const NO_PERMISSION = "Bạn không có quyền thực hiện thao tác này";

// Chuỗi rỗng → null (để cột bank lưu null khi bỏ trống).
const orNull = (v?: string): string | null => (v && v.trim() ? v.trim() : null);

// Trả orgId nếu user là quản lý (owner/admin), ngược lại trả lỗi.
async function requireManager(): Promise<{ orgId: string } | { error: string }> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: NO_PERMISSION };
  return { orgId };
}

export async function updateOrgAction(values: unknown): Promise<ActionResult> {
  const parsed = orgSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", guard.orgId);
  if (error) return { error: "Không cập nhật được cửa hàng" };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return {};
}

// Cập nhật tài khoản nhận tiền cấp cửa hàng (org).
export async function updateOrgBankAction(values: unknown): Promise<ActionResult> {
  const parsed = bankSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      bank_name: orNull(parsed.data.bankName),
      bank_account: orNull(parsed.data.bankAccount),
      bank_holder: orNull(parsed.data.bankHolder),
    })
    .eq("id", guard.orgId);
  if (error) return { error: "Không lưu được tài khoản nhận tiền" };

  revalidatePath("/settings");
  return {};
}

export async function createStoreAction(values: unknown): Promise<ActionResult> {
  const parsed = storeSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  const limitErr = await checkLimit(guard.orgId, "stores");
  if (limitErr) return { error: limitErr };

  const supabase = await createClient();
  const { error } = await supabase.from("stores").insert({
    org_id: guard.orgId,
    name: parsed.data.name,
    address: parsed.data.address || null,
    bank_name: orNull(parsed.data.bankName),
    bank_account: orNull(parsed.data.bankAccount),
    bank_holder: orNull(parsed.data.bankHolder),
  });
  if (error) return { error: "Không tạo được chi nhánh" };

  revalidatePath("/settings/stores");
  revalidatePath("/", "layout");
  return {};
}

export async function updateStoreAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = storeSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      bank_name: orNull(parsed.data.bankName),
      bank_account: orNull(parsed.data.bankAccount),
      bank_holder: orNull(parsed.data.bankHolder),
    })
    .eq("id", id);
  if (error) return { error: "Không cập nhật được chi nhánh" };

  revalidatePath("/settings/stores");
  revalidatePath("/", "layout");
  return {};
}

export async function deleteStoreAction(id: string): Promise<ActionResult> {
  const guard = await requireManager();
  if ("error" in guard) return guard;
  const supabase = await createClient();

  // Chặn xóa nếu chi nhánh đã có đơn hàng (tránh mất lịch sử do cascade)
  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", id);
  if (orderCount && orderCount > 0) {
    return { error: "Chi nhánh đã có đơn hàng, không thể xóa." };
  }

  // Phải còn ít nhất 1 chi nhánh
  const { count: storeCount } = await supabase
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("org_id", guard.orgId);
  if (storeCount !== null && storeCount <= 1) {
    return { error: "Phải còn ít nhất một chi nhánh." };
  }

  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) return { error: "Không xóa được chi nhánh" };

  revalidatePath("/settings/stores");
  revalidatePath("/", "layout");
  return {};
}
