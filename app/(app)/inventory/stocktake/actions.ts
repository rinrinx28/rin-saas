"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stocktakeSchema } from "@/lib/validations/stocktake";

export interface ActionResult {
  error?: string;
}

export async function adjustStockAction(values: unknown): Promise<ActionResult> {
  const parsed = stocktakeSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_stock", {
    p_store: parsed.data.storeId,
    p_items: parsed.data.items.map((it) => ({
      variant_id: it.variantId,
      counted: it.counted,
    })),
  });
  if (error) return { error: "Không lưu được kiểm kho" };

  revalidatePath("/inventory");
  redirect("/inventory");
}
