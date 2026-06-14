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

beforeAll(async () => {
  const email = `rep-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  userId = cu.data.user.id;
  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
  orgId = (await client.rpc("create_organization", { p_org_name: `Rep ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  const storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
  const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
  const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: 100000, cost: 60000 }).select("id").single();
  const variantId = v.data!.id;
  await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 50 });

  // Nhập 5 (vốn 60k) + bán 2 (giá 100k)
  await client.rpc("receive_purchase", {
    p_store: storeId, p_supplier: null, p_note: null,
    p_items: [{ variant_id: variantId, qty: 5, cost: 60000 }], p_paid: 300000,
  });
  const sale = await client.rpc("create_sale", {
    p_store: storeId, p_customer: null, p_discount: 0,
    p_items: [{ variant_id: variantId, qty: 2, price: 100000 }], p_method: "cash", p_paid: 200000,
  });
  if (sale.error) throw sale.error;
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("RPC báo cáo", () => {
  it("report_summary: doanh thu/đơn/giá vốn", async () => {
    const { data } = await client.rpc("report_summary", range());
    expect(data).toMatchObject({ revenue: 200000, orders: 1, cogs: 120000 });
  });

  it("report_daily_revenue: tổng doanh thu & lãi đúng", async () => {
    const { data } = await client.rpc("report_daily_revenue", range());
    const rows = data as { revenue: number; profit: number }[];
    expect(rows.reduce((s, r) => s + r.revenue, 0)).toBe(200000);
    expect(rows.reduce((s, r) => s + r.profit, 0)).toBe(80000); // 200k - 120k
  });

  it("top_products: qty/revenue/profit", async () => {
    const { data } = await client.rpc("top_products", { ...range(), p_limit: 8 });
    const r = (data as { qty: number; revenue: number; profit: number }[])[0];
    expect(r).toMatchObject({ qty: 2, revenue: 200000, profit: 80000 });
  });

  it("top_purchased_products: qty + value", async () => {
    const { data } = await client.rpc("top_purchased_products", { ...range(), p_limit: 8 });
    const r = (data as { qty: number; value: number }[])[0];
    expect(r).toMatchObject({ qty: 5, value: 300000 });
  });

  it("product_sales_vs_purchases: bán 2 / nhập 5", async () => {
    const { data } = await client.rpc("product_sales_vs_purchases", { ...range(), p_limit: 8 });
    const r = (data as { sold: number; purchased: number }[])[0];
    expect(r).toMatchObject({ sold: 2, purchased: 5 });
  });

  it("payment_method_breakdown: tiền mặt 200k", async () => {
    const { data } = await client.rpc("payment_method_breakdown", range());
    const cash = (data as { method: string; amount: number }[]).find((x) => x.method === "cash");
    expect(cash?.amount).toBe(200000);
  });

  it("top_customers: khách lẻ 200k", async () => {
    const { data } = await client.rpc("top_customers", { ...range(), p_limit: 8 });
    const r = (data as { name: string; revenue: number }[])[0];
    expect(r).toMatchObject({ name: "Khách lẻ", revenue: 200000 });
  });
});
