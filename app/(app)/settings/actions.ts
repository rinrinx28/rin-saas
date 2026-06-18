"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { checkLimit } from "@/lib/limits";
import { getActiveOrgId, getActiveStoreId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { loyaltyConfigSchema } from "@/lib/validations/loyalty";
import { bankSchema, orgSchema, storeSchema } from "@/lib/validations/settings";
import { shiftConfigSchema, shiftDefinitionSchema } from "@/lib/validations/shift";

export interface ActionResult {
  error?: string;
}

const RECONCILE_PROVIDERS = ["sepay"];

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
  const update: { name: string; logo_url?: string | null } = { name: parsed.data.name };
  if (parsed.data.logoUrl !== undefined) {
    update.logo_url = parsed.data.logoUrl.trim() || null;
  }
  const { error } = await supabase
    .from("organizations")
    .update(update)
    .eq("id", guard.orgId);
  if (error) return { error: "Không cập nhật được cửa hàng" };

  revalidatePath("/settings");
  revalidatePath("/app");
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

// ── Đối soát tự động (payment_integrations) — ADR 0010 ──────────

// Tạo tích hợp đối soát cho cửa hàng (storeId = null) hoặc một chi nhánh.
export async function createIntegrationAction(
  provider: string,
  storeId: string | null,
): Promise<ActionResult> {
  if (!RECONCILE_PROVIDERS.includes(provider)) return { error: "Nhà cung cấp không hợp lệ" };
  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase.from("payment_integrations").insert({
    org_id: guard.orgId,
    store_id: storeId,
    provider,
    webhook_token: randomBytes(16).toString("hex"),
    webhook_secret: randomBytes(24).toString("hex"),
    enabled: true,
  });
  if (error) return { error: "Không tạo được tích hợp" };

  revalidatePath("/settings");
  return {};
}

export async function regenerateIntegrationSecretAction(id: string): Promise<ActionResult> {
  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_integrations")
    .update({ webhook_secret: randomBytes(24).toString("hex") })
    .eq("id", id);
  if (error) return { error: "Không đổi được secret" };

  revalidatePath("/settings");
  return {};
}

export async function toggleIntegrationAction(id: string, enabled: boolean): Promise<ActionResult> {
  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_integrations")
    .update({ enabled })
    .eq("id", id);
  if (error) return { error: "Không cập nhật được tích hợp" };

  revalidatePath("/settings");
  return {};
}

export async function deleteIntegrationAction(id: string): Promise<ActionResult> {
  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase.from("payment_integrations").delete().eq("id", id);
  if (error) return { error: "Không xóa được tích hợp" };

  revalidatePath("/settings");
  return {};
}

// ── Ca bán hàng (shift settings) — ADR 0012 ────────────────────
export async function updateShiftConfigAction(values: unknown): Promise<ActionResult> {
  const parsed = shiftConfigSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      shift_opening_mode: parsed.data.openingMode,
      shift_fixed_float: parsed.data.fixedFloat,
    })
    .eq("id", guard.orgId);
  if (error) return { error: "Không lưu được cấu hình ca" };

  revalidatePath("/settings");
  revalidatePath("/shifts");
  return {};
}

export async function createShiftDefinitionAction(values: unknown): Promise<ActionResult> {
  const parsed = shiftDefinitionSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  // scope 'store' → gắn chi nhánh đang chọn; 'org' → store_id null (mặc định cửa hàng).
  let storeId: string | null = null;
  if (parsed.data.scope === "store") {
    storeId = await getActiveStoreId(guard.orgId);
    if (!storeId) return { error: "Chưa chọn chi nhánh" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shift_definitions").insert({
    org_id: guard.orgId,
    store_id: storeId,
    name: parsed.data.name,
    start_time: parsed.data.startTime || null,
    end_time: parsed.data.endTime || null,
  });
  if (error) return { error: "Không tạo được ca" };

  revalidatePath("/settings");
  revalidatePath("/shifts");
  return {};
}

export async function deleteShiftDefinitionAction(id: string): Promise<ActionResult> {
  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase.from("shift_definitions").delete().eq("id", id);
  if (error) return { error: "Không xoá được ca" };

  revalidatePath("/settings");
  revalidatePath("/shifts");
  return {};
}

// ── Tích điểm khách hàng (loyalty) — ADR 0013 ──────────────────
export async function updateLoyaltyAction(values: unknown): Promise<ActionResult> {
  const parsed = loyaltyConfigSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const guard = await requireManager();
  if ("error" in guard) return guard;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      loyalty_enabled: parsed.data.enabled,
      loyalty_earn_per_k: parsed.data.earnPerK,
      loyalty_redeem_value: parsed.data.redeemValue,
      loyalty_min_redeem: parsed.data.minRedeem,
    })
    .eq("id", guard.orgId);
  if (error) return { error: "Không lưu được cấu hình tích điểm" };

  revalidatePath("/settings");
  revalidatePath("/pos");
  return {};
}
