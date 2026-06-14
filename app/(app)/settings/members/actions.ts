"use server";

import { revalidatePath } from "next/cache";
import { checkLimit } from "@/lib/limits";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { inviteMemberSchema } from "@/lib/validations/member";

export interface ActionResult {
  error?: string;
}

function rpcError(message?: string): string {
  if (message?.includes("đã là thành viên")) return "Người này đã là thành viên";
  if (message?.includes("lời mời đang chờ")) return "Đã có lời mời đang chờ cho email này";
  if (message?.includes("chi nhánh của mình")) return "Quản lý chi nhánh chỉ mời nhân viên vào chi nhánh của mình";
  if (message?.includes("chọn chi nhánh")) return "Cần chọn chi nhánh";
  if (message?.includes("quyền")) return "Bạn không có quyền thực hiện";
  if (message?.includes("chủ sở hữu")) return "Phải còn ít nhất một chủ sở hữu";
  return "Thao tác thất bại";
}

// Mời thành viên qua email (tạo lời mời chờ; người nhận đồng ý/từ chối).
export async function inviteMemberAction(values: unknown): Promise<ActionResult> {
  const parsed = inviteMemberSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const limitErr = await checkLimit(orgId, "members");
  if (limitErr) return { error: limitErr };

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_member", {
    p_org: orgId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
    p_store: parsed.data.storeId ?? null,
  });
  if (error) return { error: rpcError(error.message) };

  revalidatePath("/settings/members");
  return {};
}

export async function cancelInviteAction(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_invite", { p_invite: inviteId });
  if (error) return { error: rpcError(error.message) };
  revalidatePath("/settings/members");
  return {};
}

export async function updateMemberAction(
  membershipId: string,
  role: string,
  storeId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member", {
    p_membership: membershipId,
    p_role: role,
    p_store: storeId,
  });
  if (error) return { error: rpcError(error.message) };
  revalidatePath("/settings/members");
  return {};
}

export async function removeMemberAction(membershipId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_membership: membershipId });
  if (error) return { error: rpcError(error.message) };
  revalidatePath("/settings/members");
  return {};
}
