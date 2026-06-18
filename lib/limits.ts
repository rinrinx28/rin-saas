import { getOrgPlan } from "@/lib/org";
import { getPlan, LIMIT_LABEL, type LimitKind } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const TABLE: Record<LimitKind, string> = {
  products: "products",
  stores: "stores",
  members: "memberships",
};

// Trả số đã dùng + giới hạn của org cho 1 loại tài nguyên.
// Với "members", lời mời đang chờ (pending) cũng tính là 1 ghế đã giữ chỗ — khớp
// cách enforce ở RPC (org_member_limit), tránh mời vượt trần rồi đồng ý hàng loạt.
export async function getUsage(
  orgId: string,
  kind: LimitKind,
): Promise<{ used: number; limit: number | null }> {
  const plan = getPlan(await getOrgPlan(orgId));
  const supabase = await createClient();
  const { count } = await supabase
    .from(TABLE[kind])
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  let used = count ?? 0;

  if (kind === "members") {
    const { count: pending } = await supabase
      .from("member_invites")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending");
    used += pending ?? 0;
  }

  return { used, limit: plan.limits[kind] };
}

// Trả thông báo lỗi nếu đã chạm giới hạn, ngược lại null.
export async function checkLimit(orgId: string, kind: LimitKind): Promise<string | null> {
  const { used, limit } = await getUsage(orgId, kind);
  if (limit !== null && used >= limit) {
    const plan = getPlan(await getOrgPlan(orgId));
    return `Đã đạt giới hạn ${LIMIT_LABEL[kind]} của gói ${plan.name} (${limit}). Nâng cấp gói để thêm.`;
  }
  return null;
}
