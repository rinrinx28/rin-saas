import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, ACTIVE_STORE_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

// Org đang active của user hiện tại (theo cookie, fallback org đầu tiên).
export async function getActiveOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at");
  if (!orgs || orgs.length === 0) return null;

  const cookieStore = await cookies();
  const active = orgs.find(
    (o) => o.id === cookieStore.get(ACTIVE_ORG_COOKIE)?.value,
  );
  return (active ?? orgs[0]).id;
}

// Vai trò của user hiện tại trong org (owner | admin | staff | null).
export async function getMyRole(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.role ?? null;
}

// Quản lý = owner hoặc admin (được phép thao tác nhạy cảm).
export async function isManager(orgId: string): Promise<boolean> {
  const role = await getMyRole(orgId);
  return role === "owner" || role === "admin";
}

// Chi nhánh đang active của org (theo cookie, fallback chi nhánh đầu tiên).
export async function getActiveStoreId(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("org_id", orgId)
    .order("created_at");
  if (!stores || stores.length === 0) return null;

  const cookieStore = await cookies();
  const active = stores.find(
    (s) => s.id === cookieStore.get(ACTIVE_STORE_COOKIE)?.value,
  );
  return (active ?? stores[0]).id;
}
