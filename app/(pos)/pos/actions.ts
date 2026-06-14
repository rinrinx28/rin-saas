"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saleSchema } from "@/lib/validations/sale";

export interface SaleResult {
  error?: string;
  sale?: { id: string; code: string; total: number };
}

export async function createSaleAction(values: unknown): Promise<SaleResult> {
  const parsed = saleSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sale", {
    p_store: parsed.data.storeId,
    p_customer: parsed.data.customerId || null,
    p_discount: parsed.data.discount,
    p_items: parsed.data.items.map((it) => ({
      variant_id: it.variantId,
      qty: it.qty,
      price: it.price,
    })),
    p_method: parsed.data.method,
    p_paid: parsed.data.paid,
  });
  if (error) {
    return {
      error: error.message.includes("tồn kho")
        ? "Không đủ tồn kho cho một sản phẩm trong giỏ"
        : "Không tạo được đơn hàng",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/orders");
  return { sale: data as { id: string; code: string; total: number } };
}
