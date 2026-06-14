import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";
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
