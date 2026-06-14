import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEInvoiceProvider } from "../lib/einvoice";
import { loadEnv } from "./helpers/env";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "matkhau-test-12345";
const STAMP = Date.now();

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const res = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (res.error) throw res.error;
  return client;
}

async function createUser(tag: string): Promise<{ id: string; email: string }> {
  const email = `einv-${tag}-${STAMP}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  return { id: created.data.user.id, email };
}

// Tham số phát hành "issued" mô phỏng kết quả provider.
function issuedArgs(orderId: string) {
  return {
    p_order: orderId,
    p_provider: "stub",
    p_status: "issued",
    p_series: "1C26TYY",
    p_no: "00000123",
    p_cqt: "00ABCDEF00ABCDEF00ABCDEF00ABCDEF12",
    p_lookup: "https://tra-cuu-hddt.example/lookup?code=x",
    p_pdf: null,
    p_error: null,
    p_payload: { stub: true },
  };
}

let owner: { id: string; email: string };
let staff: { id: string; email: string };
let ownerClient: SupabaseClient;
let staffClient: SupabaseClient;
let orgId: string;
let orderId: string;

beforeAll(async () => {
  owner = await createUser("owner");
  staff = await createUser("staff");

  ownerClient = await signIn(owner.email);
  const rpc = await ownerClient.rpc("create_organization", {
    p_org_name: `EInv Org ${STAMP}`,
    p_store_name: "CN1",
    p_store_address: null,
  });
  if (rpc.error) throw rpc.error;
  orgId = rpc.data as string;

  const stores = await ownerClient.from("stores").select("id").eq("org_id", orgId);
  if (stores.error) throw stores.error;
  const storeId = stores.data[0].id as string;

  // staff là thành viên vai trò 'staff' của org.
  const mem = await admin
    .from("memberships")
    .insert({ user_id: staff.id, org_id: orgId, role: "staff" });
  if (mem.error) throw mem.error;
  staffClient = await signIn(staff.email);

  // Tạo đơn trực tiếp bằng service role (bỏ qua RLS) cho mục đích test.
  const order = await admin
    .from("orders")
    .insert({
      org_id: orgId,
      store_id: storeId,
      code: `HD-EINV-${STAMP}`,
      status: "completed",
      subtotal: 100000,
      discount: 0,
      total: 100000,
      paid: 100000,
    })
    .select("id")
    .single();
  if (order.error) throw order.error;
  orderId = order.data.id as string;
}, 60000);

afterAll(async () => {
  await admin.from("organizations").delete().eq("id", orgId);
  if (owner?.id) await admin.auth.admin.deleteUser(owner.id);
  if (staff?.id) await admin.auth.admin.deleteUser(staff.id);
}, 60000);

describe("HĐĐT — provider stub (đơn vị)", () => {
  it("stub phát hành ra mã CQT + link tra cứu, ổn định theo id đơn", async () => {
    const provider = getEInvoiceProvider();
    const order = {
      id: "fixed-order-id",
      code: "HD250101-000001",
      subtotal: 100000,
      discount: 0,
      total: 100000,
      createdAt: new Date(0).toISOString(),
      storeName: "CN1",
      storeAddress: null,
      customerName: null,
      customerPhone: null,
      items: [{ name: "SP A — Mặc định", qty: 1, price: 100000, total: 100000 }],
    };
    const r1 = await provider.issue(order);
    const r2 = await provider.issue(order);
    expect(r1.status).toBe("issued");
    expect(r1.taxAuthorityCode).toBeTruthy();
    expect(r1.lookupUrl).toContain("http");
    expect(r2.taxAuthorityCode).toBe(r1.taxAuthorityCode); // ổn định
  });
});

describe("HĐĐT — RPC issue_einvoice (cloud, RLS/RBAC)", () => {
  it("quản lý phát hành được → trạng thái issued + mã CQT", async () => {
    const { data, error } = await ownerClient.rpc("issue_einvoice", issuedArgs(orderId));
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    const row = data as { status: string; tax_authority_code: string; issued_at: string };
    expect(row.status).toBe("issued");
    expect(row.tax_authority_code).toBeTruthy();
    expect(row.issued_at).toBeTruthy();
  });

  it("phát hành lần 2 là idempotent → trả về cùng bản ghi, không tạo trùng", async () => {
    const first = await ownerClient.rpc("issue_einvoice", issuedArgs(orderId));
    const second = await ownerClient.rpc("issue_einvoice", issuedArgs(orderId));
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect((second.data as { id: string }).id).toBe((first.data as { id: string }).id);

    const rows = await admin
      .from("einvoices")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "issued");
    expect(rows.data).toHaveLength(1);
  });

  it("nhân viên (staff) KHÔNG được phát hành HĐĐT", async () => {
    // Dùng đơn khác để tránh nhánh idempotent trả về bản đã có.
    const other = await admin
      .from("orders")
      .insert({
        org_id: orgId,
        store_id: (await admin.from("stores").select("id").eq("org_id", orgId).single()).data!.id,
        code: `HD-EINV2-${STAMP}`,
        status: "completed",
        subtotal: 50000,
        discount: 0,
        total: 50000,
        paid: 50000,
      })
      .select("id")
      .single();
    const otherId = other.data!.id as string;

    const { error } = await staffClient.rpc("issue_einvoice", issuedArgs(otherId));
    expect(error).not.toBeNull();
    expect(error?.message).toContain("quản lý");
  });
});
