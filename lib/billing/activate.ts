import { createAdminClient } from "@/lib/supabase/admin";

export interface ConfirmResult {
  ok: boolean;
  reason?: string;
}

const PLAN_DAYS = 30;

// Đối soát: tìm yêu cầu theo memo, đủ tiền → đánh dấu paid + kích hoạt gói.
// Dùng service role (gọi từ webhook hoặc giả lập). Idempotent.
export async function confirmPayment(memo: string, amount: number): Promise<ConfirmResult> {
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("payment_requests")
    .select("id, org_id, plan, amount, status")
    .eq("memo", memo)
    .maybeSingle();

  if (!req) return { ok: false, reason: "memo_not_found" };
  if (req.status === "paid") return { ok: true }; // đã xử lý
  if (req.status !== "pending") return { ok: false, reason: "not_pending" };
  if (amount < req.amount) return { ok: false, reason: "amount_too_low" };

  const now = new Date();
  const expires = new Date(now.getTime() + PLAN_DAYS * 86400000);

  await admin
    .from("payment_requests")
    .update({ status: "paid", paid_at: now.toISOString() })
    .eq("id", req.id);

  await admin
    .from("organizations")
    .update({ plan: req.plan, plan_expires_at: expires.toISOString() })
    .eq("id", req.org_id);

  return { ok: true };
}
