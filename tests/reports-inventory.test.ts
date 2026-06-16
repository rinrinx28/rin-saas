import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadEnv } from "./helpers/env";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "matkhau-test-12345";
const STAMP = Date.now();
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

let userId: string;
let orgId: string;
let client: SupabaseClient;
const range = () => ({
  p_org: orgId,
  p_from: new Date(Date.now() - 2 * 86400000).toISOString(),
  p_to: new Date(Date.now() + 60000).toISOString(),
});

// Fixture: 3 variant cùng "Chưa phân loại"
//  A — bán chạy:   giá 100k, vốn 60k, tồn 50 → bán 2 → còn 48, bán hôm nay
//  B — tồn đọng:   giá 50k,  vốn 30k, tồn 3,  chưa từng bán (sắp hết + tồn đọng)
//  C — hết hàng:   giá 20k,  vốn 10k, tồn 0,  chưa từng bán
beforeAll(async () => {
  const email = `repinv-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  userId = cu.data.user.id;
  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
  orgId = (await client.rpc("create_organization", { p_org_name: `RepInv ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  const storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;

  async function makeVariant(name: string, price: number, cost: number, qty: number): Promise<string> {
    const pr = await admin.from("products").insert({ org_id: orgId, name }).select("id").single();
    const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: pr.data!.id, name: "M", price, cost }).select("id").single();
    await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: v.data!.id, qty });
    return v.data!.id as string;
  }

  const a = await makeVariant("Hàng bán chạy", 100000, 60000, 50);
  await makeVariant("Hàng tồn đọng", 50000, 30000, 3);
  await makeVariant("Hàng hết", 20000, 10000, 0);

  // Bán 2 cái A hôm nay → tồn A còn 48
  const sale = await client.rpc("create_sale", {
    p_store: storeId, p_customer: null, p_discount: 0,
    p_items: [{ variant_id: a, qty: 2, price: 100000 }], p_method: "cash", p_paid: 200000,
  });
  if (sale.error) throw sale.error;
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("RPC báo cáo tồn kho & lãi/lỗ", () => {
  it("report_inventory_summary: SKU/hết hàng/định giá đúng", async () => {
    const { data } = await client.rpc("report_inventory_summary", { p_org: orgId });
    expect(data).toMatchObject({
      sku_count: 3,
      out_of_stock: 1,
      total_qty: 51, // 48 + 3 + 0
      cost_value: 2970000, // 48*60k + 3*30k
      retail_value: 4950000, // 48*100k + 3*50k
    });
  });

  it("report_inventory_by_category: gộp 'Chưa phân loại'", async () => {
    const { data } = await client.rpc("report_inventory_by_category", { p_org: orgId });
    const rows = data as { name: string; qty: number; cost_value: number; retail_value: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Chưa phân loại", qty: 51, cost_value: 2970000, retail_value: 4950000 });
  });

  it("report_low_stock: ngưỡng 5 → 2 mục (hết hàng xếp trước)", async () => {
    const { data } = await client.rpc("report_low_stock", { p_org: orgId, p_threshold: 5, p_limit: 20 });
    const rows = data as { name: string; store: string; qty: number; price: number }[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ qty: 0, store: "CN1" }); // hết hàng (qty asc)
    expect(rows[1].qty).toBe(3);
  });

  it("report_low_stock: ngưỡng 0 → chỉ hàng hết", async () => {
    const { data } = await client.rpc("report_low_stock", { p_org: orgId, p_threshold: 0, p_limit: 20 });
    const rows = data as { qty: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(0);
  });

  it("report_dead_stock: 30 ngày → hàng tồn chưa bán (loại hàng bán hôm nay & hàng hết)", async () => {
    const { data } = await client.rpc("report_dead_stock", { p_org: orgId, p_days: 30, p_limit: 20 });
    const rows = data as { name: string; qty: number; cost_value: number; last_sold: string | null }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ qty: 3, cost_value: 90000, last_sold: null });
    expect(rows[0].name).toContain("Hàng tồn đọng");
  });

  it("report_profit_by_category: lãi gộp theo danh mục", async () => {
    const { data } = await client.rpc("report_profit_by_category", { ...range(), p_limit: 8 });
    const rows = data as { name: string; revenue: number; cogs: number; profit: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Chưa phân loại", revenue: 200000, cogs: 120000, profit: 80000 });
  });
});
