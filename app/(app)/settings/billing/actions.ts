"use server";

import { revalidatePath } from "next/cache";
import { confirmPayment } from "@/lib/billing/activate";
import { getActiveOrgId, isManager } from "@/lib/org";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

export interface PaymentRequestResult {
  error?: string;
  memo?: string;
  amount?: number;
  requestId?: string;
}

function genMemo(): string {
  let s = "";
  for (let i = 0; i < 7; i++) s += "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)];
  return `RIN${s}`;
}

// Tạo yêu cầu thanh toán cho gói trả phí → trả về memo + số tiền để chuyển khoản.
export async function createPaymentRequestAction(plan: string): Promise<PaymentRequestResult> {
  if (plan !== "pro" && plan !== "business") return { error: "Gói không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: "Bạn không có quyền đổi gói" };

  const amount = PLANS[plan].price;
  const memo = genMemo();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      org_id: orgId,
      plan,
      amount,
      memo,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Không tạo được yêu cầu thanh toán" };

  return { memo, amount, requestId: data.id };
}

// Kiểm tra trạng thái yêu cầu thanh toán (cho UI poll khi chờ webhook đối soát).
export async function checkPaymentStatusAction(memo: string): Promise<{ status?: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_requests")
    .select("status")
    .eq("memo", memo)
    .maybeSingle();
  return { status: data?.status };
}

// Hạ về gói miễn phí (không cần thanh toán).
export async function downgradeToFreeAction(): Promise<ActionResult> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: "Bạn không có quyền đổi gói" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ plan: "free", plan_expires_at: null })
    .eq("id", orgId);
  if (error) return { error: "Không đổi được gói" };

  revalidatePath("/settings/billing");
  return {};
}

// Giả lập đã chuyển khoản (chỉ bật ở môi trường dev) → chạy đúng luồng đối soát.
export async function simulatePaymentAction(memo: string): Promise<ActionResult> {
  if (process.env.NEXT_PUBLIC_PAYMENT_SIMULATE !== "true") {
    return { error: "Giả lập đang tắt" };
  }
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("payment_requests")
    .select("amount")
    .eq("memo", memo)
    .maybeSingle();
  if (!req) return { error: "Không tìm thấy yêu cầu" };

  const res = await confirmPayment(memo, req.amount);
  if (!res.ok) return { error: "Đối soát thất bại" };

  revalidatePath("/settings/billing");
  return {};
}
