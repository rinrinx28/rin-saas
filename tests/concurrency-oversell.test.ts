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

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId: string;
let client: SupabaseClient;
let orgId: string;
let storeId: string;
let variantId: string;

beforeAll(async () => {
  const email = `oversell-${STAMP}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  client = createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;

  // org + store
  const rpc = await client.rpc("create_organization", {
    p_org_name: `Oversell ${STAMP}`,
    p_store_name: "CN Test",
    p_store_address: null,
  });
  if (rpc.error) throw rpc.error;
  orgId = rpc.data as string;
  const stores = await client.from("stores").select("id").eq("org_id", orgId);
  storeId = stores.data![0].id;

  // sản phẩm + 1 biến thể
  const product = await client
    .from("products")
    .insert({ org_id: orgId, name: "Hàng hiếm", is_active: true })
    .select("id")
    .single();
  if (product.error) throw product.error;
  const variant = await client
    .from("product_variants")
    .insert({ org_id: orgId, product_id: product.data.id, name: "Mặc định", price: 100000, cost: 50000 })
    .select("id")
    .single();
  if (variant.error) throw variant.error;
  variantId = variant.data.id;

  // nhập đúng 1 cái → tồn = 1
  const recv = await client.rpc("receive_purchase", {
    p_store: storeId,
    p_supplier: null,
    p_note: null,
    p_items: [{ variant_id: variantId, qty: 1, cost: 50000 }],
    p_paid: 50000,
  });
  if (recv.error) throw recv.error;
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("Chống bán âm khi mua đồng thời (tồn = 1)", () => {
  it("hai lệnh bán cùng lúc → đúng 1 thành công, 1 thất bại", async () => {
    const saleArgs = {
      p_store: storeId,
      p_customer: null,
      p_discount: 0,
      p_items: [{ variant_id: variantId, qty: 1, price: 100000 }],
      p_method: "cash",
      p_paid: 100000,
    };

    // Bắn 2 lệnh bán đồng thời
    const [r1, r2] = await Promise.all([
      client.rpc("create_sale", saleArgs),
      client.rpc("create_sale", saleArgs),
    ]);

    const ok = [r1, r2].filter((r) => !r.error).length;
    const failed = [r1, r2].filter((r) => r.error).length;

    expect(ok).toBe(1);
    expect(failed).toBe(1);
  });

  it("tồn kho cuối = 0 (không âm), chỉ 1 đơn được tạo", async () => {
    const inv = await admin
      .from("inventory")
      .select("qty")
      .eq("store_id", storeId)
      .eq("variant_id", variantId)
      .single();
    expect(inv.data?.qty).toBe(0);

    const orders = await admin.from("orders").select("id").eq("org_id", orgId);
    expect(orders.data?.length).toBe(1);

    const outMovements = await admin
      .from("stock_movements")
      .select("qty")
      .eq("org_id", orgId)
      .eq("type", "out");
    expect(outMovements.data?.length).toBe(1);
  });
});
