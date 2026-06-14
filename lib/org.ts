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
