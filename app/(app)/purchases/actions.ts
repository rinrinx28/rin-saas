"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { purchaseSchema } from "@/lib/validations/purchase";

export interface ActionResult {
  error?: string;
}

export async function createPurchaseAction(values: unknown): Promise<ActionResult> {
  const parsed = purchaseSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_purchase", {
    p_store: parsed.data.storeId,
    p_supplier: parsed.data.supplierId || null,
    p_note: parsed.data.note || null,
    p_items: parsed.data.items.map((it) => ({
      variant_id: it.variantId,
      qty: it.qty,
      cost: it.cost,
    })),
    p_paid: parsed.data.paid,
  });
  if (error) {
    return {
      error: error.message.includes("nhà cung cấp")
        ? "Phải chọn nhà cung cấp để ghi nợ"
        : "Không tạo được phiếu nhập",
    };
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  redirect("/purchases");
}
