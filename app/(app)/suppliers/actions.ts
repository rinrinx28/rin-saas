"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validations/supplier";

export interface ActionResult {
  error?: string;
}

export async function createSupplierAction(values: unknown): Promise<ActionResult> {
  const parsed = supplierSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    org_id: orgId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
  });
  if (error) return { error: "Không tạo được nhà cung cấp" };

  revalidatePath("/suppliers");
  return {};
}

export async function updateSupplierAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = supplierSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ name: parsed.data.name, phone: parsed.data.phone || null })
    .eq("id", id);
  if (error) return { error: "Không cập nhật được nhà cung cấp" };

  revalidatePath("/suppliers");
  return {};
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { error: "Không xóa được nhà cung cấp" };

  revalidatePath("/suppliers");
  return {};
}

export async function paySupplierDebtAction(
  id: string,
  amount: number,
): Promise<ActionResult> {
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Số tiền không hợp lệ" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_supplier_debt", {
    p_supplier: id,
    p_amount: amount,
  });
  if (error) return { error: "Không trả được nợ" };

  revalidatePath("/suppliers");
  return {};
}
