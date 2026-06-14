import { createBrowserClient } from "@supabase/ssr";

// Client phía browser — chỉ dùng anon key + RLS (ADR: service_role không xuống client)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
