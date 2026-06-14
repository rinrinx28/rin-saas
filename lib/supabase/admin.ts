import { createClient } from "@supabase/supabase-js";

// Client service-role — CHỈ dùng phía server (webhook, đối soát). Bỏ qua RLS.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
