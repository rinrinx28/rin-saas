"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface MyInvite {
  id: string;
  org_id: string;
  org_name: string;
  role: string;
  store_id: string | null;
  store_name: string | null;
  invited_at: string;
}

export async function getMyInvitesAction(): Promise<MyInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_invites_for_me");
  return (data as MyInvite[] | null) ?? [];
}

export async function acceptInviteAction(inviteId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_invite: inviteId });
  if (error) return { error: "Không tham gia được cửa hàng" };
  revalidatePath("/", "layout");
  return {};
}

export async function declineInviteAction(inviteId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invite", { p_invite: inviteId });
  if (error) return { error: "Không từ chối được lời mời" };
  return {};
}
