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
let storeId: string;
let variantId: string;
let customerId: string;
const PRICE = 100000;

interface SaleResult {
  id: string;
  total: number;
  discount: number;
  redeem_value: number;
  points_earned: number;
}

async function sale(opts: { customer?: string | null; code?: string | null; redeem?: number } = {}): Promise<SaleResult> {
  const r = await client.rpc("create_sale", {
    p_store: storeId,
    p_customer: opts.customer ?? null,
    p_discount: 0,
    p_items: [{ variant_id: variantId, qty: 1, price: PRICE }],
    p_method: "cash",
    p_paid: 10_000_000, // clamp về total → trả đủ
    p_code: opts.code ?? null,
    p_redeem_points: opts.redeem ?? 0,
  });
  if (r.error) throw r.error;
  return r.data as SaleResult;
}

async function deactivateAllPromos() {
  await admin.from("promotions").update({ active: false }).eq("org_id", orgId);
}
async function points(): Promise<number> {
  const r = await admin.from("customers").select("points").eq("id", customerId).single();
  return r.data!.points as number;
}

beforeAll(async () => {
  const email = `promo-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  userId = cu.data.user.id;
  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
  orgId = (await client.rpc("create_organization", { p_org_name: `Promo ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
  const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
  const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: PRICE, cost: 60000 }).select("id").single();
  variantId = v.data!.id;
  await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 500 });
  const cust = await admin.from("customers").insert({ org_id: orgId, name: "KH điểm" }).select("id").single();
  customerId = cust.data!.id;
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("Khuyến mãi", () => {
  it("KM % công khai tự áp", async () => {
    await deactivateAllPromos();
    await admin.from("promotions").insert({ org_id: orgId, name: "Giảm 10%", type: "percent", value: 10, active: true });
    const s = await sale();
    expect(s.discount).toBe(10000);
    expect(s.total).toBe(90000);
  });

  it("KM theo mã coupon (chỉ áp khi nhập đúng mã)", async () => {
    await deactivateAllPromos();
    await admin.from("promotions").insert({ org_id: orgId, name: "Giảm 50k", type: "amount", value: 50000, code: "GIAM50", active: true });
    expect((await sale({ code: "GIAM50" })).total).toBe(50000);
    expect((await sale({ code: null })).total).toBe(PRICE); // không nhập mã → không áp
  });

  it("không áp khi chưa đạt đơn tối thiểu", async () => {
    await deactivateAllPromos();
    await admin.from("promotions").insert({ org_id: orgId, name: "Đơn lớn", type: "percent", value: 20, min_order: 200000, active: true });
    expect((await sale()).total).toBe(PRICE);
  });
});

describe("Tích điểm", () => {
  beforeAll(async () => {
    await deactivateAllPromos();
    await admin.from("organizations").update({
      loyalty_enabled: true, loyalty_earn_per_k: 1, loyalty_redeem_value: 1000, loyalty_min_redeem: 0,
    }).eq("id", orgId);
    await admin.from("customers").update({ points: 0 }).eq("id", customerId);
  });

  it("tích điểm theo tổng sau giảm", async () => {
    const before = await points();
    const s = await sale({ customer: customerId }); // total 100.000 → +100 điểm
    expect(s.points_earned).toBe(100);
    expect(await points()).toBe(before + 100);
  });

  it("đổi điểm trừ vào tổng + ghi nhận đúng", async () => {
    const before = await points(); // 100
    const s = await sale({ customer: customerId, redeem: 50 });
    expect(s.redeem_value).toBe(50000); // 50 điểm × 1.000đ
    expect(s.total).toBe(50000); // 100.000 − 50.000
    expect(s.points_earned).toBe(50); // floor(50.000/1.000)
    // điểm: −50 (đổi) +50 (tích) = không đổi
    expect(await points()).toBe(before);
  });

  it("không bán âm khi đổi vượt số điểm có", async () => {
    await admin.from("customers").update({ points: 30 }).eq("id", customerId);
    const s = await sale({ customer: customerId, redeem: 9999 }); // chỉ có 30 điểm
    expect(s.redeem_value).toBe(30000); // cap theo điểm hiện có
    expect(s.total).toBe(70000);
  });
});
