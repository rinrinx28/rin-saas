"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { customerSchema } from "@/lib/validations/customer";

export interface ActionResult {
  error?: string;
}

export async function createCustomerAction(values: unknown): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    org_id: orgId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
  });
  if (error) return { error: "Không tạo được khách hàng" };

  revalidatePath("/customers");
  return {};
}

export async function updateCustomerAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ name: parsed.data.name, phone: parsed.data.phone || null })
    .eq("id", id);
  if (error) return { error: "Không cập nhật được khách hàng" };

  revalidatePath("/customers");
  return {};
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: "Không xóa được khách hàng" };

  revalidatePath("/customers");
  return {};
}

export async function collectDebtAction(
  id: string,
  amount: number,
): Promise<ActionResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: "Số tiền không hợp lệ" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("collect_customer_debt", {
    p_customer: id,
    p_amount: amount,
  });
  if (error) return { error: "Không thu được nợ" };

  revalidatePath("/customers");
  return {};
}
