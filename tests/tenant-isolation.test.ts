import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadEnv } from "./helpers/env";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "matkhau-test-12345";
const STAMP = Date.now();

// Service role bỏ qua RLS — chỉ dùng để tạo user & dọn dẹp, KHÔNG dùng để test.
const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface Tenant {
  userId: string;
  email: string;
  client: SupabaseClient;
  orgId: string;
  storeId: string;
}

async function createTenant(tag: string): Promise<Tenant> {
  const email = `tenant-${tag}-${STAMP}@example.com`;

  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;

  // Client đăng nhập bằng anon key + session của user → bị RLS ràng buộc
  const client = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;

  const rpc = await client.rpc("create_organization", {
    p_org_name: `Org ${tag} ${STAMP}`,
    p_store_name: `Store ${tag}`,
    p_store_address: null,
  });
  if (rpc.error) throw rpc.error;
  const orgId = rpc.data as string;

  const stores = await client.from("stores").select("id").eq("org_id", orgId);
  if (stores.error) throw stores.error;
  const storeId = stores.data[0].id as string;

  return { userId, email, client, orgId, storeId };
}

let A: Tenant;
let B: Tenant;

beforeAll(async () => {
  A = await createTenant("a");
  B = await createTenant("b");
}, 60000);

afterAll(async () => {
  // Dọn: xóa org (cascade store + membership) rồi xóa user
  await admin.from("organizations").delete().in("id", [A?.orgId, B?.orgId]);
  if (A?.userId) await admin.auth.admin.deleteUser(A.userId);
  if (B?.userId) await admin.auth.admin.deleteUser(B.userId);
}, 60000);

describe("Cô lập tenant (RLS)", () => {
  it("user A chỉ thấy org của chính mình", async () => {
    const { data, error } = await A.client.from("organizations").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((o) => o.id);
    expect(ids).toContain(A.orgId);
    expect(ids).not.toContain(B.orgId);
  });

  it("user A KHÔNG đọc được org của B (kể cả lọc đúng id)", async () => {
    const { data, error } = await A.client
      .from("organizations")
      .select("id")
      .eq("id", B.orgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("user A KHÔNG đọc được store của B", async () => {
    const { data, error } = await A.client
      .from("stores")
      .select("id")
      .eq("org_id", B.orgId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("user A KHÔNG ghi được store vào org của B", async () => {
    const { data, error } = await A.client
      .from("stores")
      .insert({ org_id: B.orgId, name: "Chi nhánh lậu" })
      .select();
    // RLS chặn: hoặc lỗi, hoặc không có dòng nào được tạo
    const blocked = error !== null || (data ?? []).length === 0;
    expect(blocked).toBe(true);
  });

  it("đối xứng: user B chỉ thấy org của mình, không thấy của A", async () => {
    const { data, error } = await B.client.from("organizations").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((o) => o.id);
    expect(ids).toContain(B.orgId);
    expect(ids).not.toContain(A.orgId);
  });
});
