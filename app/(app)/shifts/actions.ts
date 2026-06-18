"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordCashSchema } from "@/lib/validations/cash";
import { closeShiftSchema, openShiftSchema } from "@/lib/validations/shift";

export interface ActionResult {
  error?: string;
}

export async function openShiftAction(values: unknown): Promise<ActionResult> {
  const parsed = openShiftSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("open_shift", {
    p_store: parsed.data.storeId,
    p_definition: parsed.data.definitionId || null,
    p_opening_cash: parsed.data.openingCash,
    p_note: parsed.data.note || null,
  });
  if (error) {
    return {
      error: error.message.includes("đang có ca mở")
        ? "Chi nhánh đang có ca mở — hãy chốt ca trước"
        : error.message.includes("Ca không hợp lệ")
          ? "Ca chọn không hợp lệ cho chi nhánh"
          : "Không mở được ca",
    };
  }
  revalidatePath("/shifts");
  return {};
}

export interface CloseShiftResult extends ActionResult {
  summary?: {
    opening: number;
    sales_cash: number;
    cash_in: number;
    cash_out: number;
    expected: number;
    counted: number;
    diff: number;
  };
}

export async function closeShiftAction(values: unknown): Promise<CloseShiftResult> {
  const parsed = closeShiftSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_shift", {
    p_shift: parsed.data.shiftId,
    p_counted: parsed.data.counted,
    p_note: parsed.data.note || null,
    p_breakdown: parsed.data.breakdown ?? null,
  });
  if (error) {
    return {
      error: error.message.includes("đã chốt")
        ? "Ca đã được chốt"
        : error.message.includes("quyền")
          ? "Bạn không có quyền chốt ca này"
          : "Không chốt được ca",
    };
  }
  revalidatePath("/shifts");
  return { summary: data as CloseShiftResult["summary"] };
}

export async function recordCashAction(values: unknown): Promise<ActionResult> {
  const parsed = recordCashSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_cash", {
    p_store: parsed.data.storeId,
    p_direction: parsed.data.direction,
    p_category: parsed.data.category,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || null,
  });
  if (error) return { error: "Không ghi được phiếu quỹ" };

  revalidatePath("/cash");
  revalidatePath("/shifts");
  return {};
}
