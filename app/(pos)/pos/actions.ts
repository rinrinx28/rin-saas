"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { saleSchema, transferOrderSchema } from "@/lib/validations/sale";

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
    p_code: parsed.data.code || null,
    p_redeem_points: parsed.data.redeemPoints ?? 0,
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

// Tạo đơn chờ chuyển khoản (paid 0) → trả mã đơn để sinh QR mang đúng mã.
export async function createTransferOrderAction(values: unknown): Promise<SaleResult> {
  const parsed = transferOrderSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_transfer_order", {
    p_store: parsed.data.storeId,
    p_customer: parsed.data.customerId || null,
    p_discount: parsed.data.discount,
    p_items: parsed.data.items.map((it) => ({
      variant_id: it.variantId,
      qty: it.qty,
      price: it.price,
    })),
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

// Thu ngân xác nhận đã nhận tiền (khi chưa bật webhook đối soát).
export async function confirmTransferPaidAction(orderId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_manual_payment", {
    p_order: orderId,
    p_method: "transfer",
  });
  if (error) return { error: "Không xác nhận được thanh toán" };
  revalidatePath("/orders");
  return {};
}

// Huỷ đơn chờ thanh toán (hoàn tồn kho).
export async function cancelTransferOrderAction(orderId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", { p_order: orderId });
  if (error) {
    return {
      error: error.message.includes("đã thanh toán")
        ? "Đơn đã thanh toán, không thể huỷ"
        : "Không huỷ được đơn",
    };
  }
  revalidatePath("/inventory");
  revalidatePath("/orders");
  return {};
}

export interface QuickCustomerResult {
  error?: string;
  customer?: { id: string; name: string; phone: string | null };
}

// Tạo nhanh khách hàng ngay tại POS → trả về để chọn liền.
export async function quickCreateCustomerAction(
  name: string,
  phone: string | null,
): Promise<QuickCustomerResult> {
  const trimmed = name.trim();
  if (trimmed.length < 1) return { error: "Tên khách không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ org_id: orgId, name: trimmed, phone: phone?.trim() || null })
    .select("id, name, phone")
    .single();
  if (error || !data) return { error: "Không tạo được khách hàng" };

  revalidatePath("/customers");
  return { customer: data as { id: string; name: string; phone: string | null } };
}

// Xem trước khuyến mãi cho giỏ hiện tại (mã + tự áp) → tổng đúng trước khi thu.
export async function previewPromoAction(
  subtotal: number,
  code: string | null,
): Promise<{ discount: number }> {
  if (subtotal <= 0) return { discount: 0 };
  const orgId = await getActiveOrgId();
  if (!orgId) return { discount: 0 };

  const supabase = await createClient();
  const { data } = await supabase.rpc("promo_discount", {
    p_org: orgId,
    p_subtotal: subtotal,
    p_code: code || null,
  });
  const result = data as { discount?: number } | null;
  return { discount: result?.discount ?? 0 };
}

// Poll trạng thái trả tiền của đơn (fallback khi realtime trễ).
export async function checkOrderPaidAction(
  orderId: string,
): Promise<{ paid: number; total: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("paid, total")
    .eq("id", orderId)
    .maybeSingle();
  return data ? { paid: data.paid, total: data.total } : null;
}
