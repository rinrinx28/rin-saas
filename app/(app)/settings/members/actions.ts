"use server";

import { revalidatePath } from "next/cache";
import { checkLimit } from "@/lib/limits";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { addMemberSchema } from "@/lib/validations/member";

export interface ActionResult {
  error?: string;
}

function rpcError(message?: string): string {
  if (message?.includes("Email chưa có")) return "Email chưa có tài khoản trên hệ thống";
  if (message?.includes("đã là thành viên")) return "Người này đã là thành viên";
  if (message?.includes("quyền")) return "Bạn không có quyền thực hiện";
  if (message?.includes("chủ sở hữu")) return "Phải còn ít nhất một chủ sở hữu";
  return "Thao tác thất bại";
}

export async function addMemberAction(values: unknown): Promise<ActionResult> {
  const parsed = addMemberSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };

  const limitErr = await checkLimit(orgId, "members");
  if (limitErr) return { error: limitErr };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_member", {
    p_org: orgId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) return { error: rpcError(error.message) };

  revalidatePath("/settings/members");
  return {};
}

export async function updateMemberRoleAction(
  membershipId: string,
  role: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member_role", {
    p_membership: membershipId,
    p_role: role,
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
