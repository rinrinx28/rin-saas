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
const PRICE = 200000;

async function invQty(): Promise<number> {
  const r = await admin.from("inventory").select("qty").eq("variant_id", variantId).eq("store_id", storeId).single();
  return r.data!.qty as number;
}

// Tạo đơn mới, trả về { orderId, itemId } của dòng đầu.
async function newSale(qty: number, paid: number, customer: string | null): Promise<{ orderId: string; itemId: string }> {
  const sale = await client.rpc("create_sale", {
    p_store: storeId, p_customer: customer, p_discount: 0,
    p_items: [{ variant_id: variantId, qty, price: PRICE }],
    p_method: "cash", p_paid: paid,
  });
  if (sale.error) throw sale.error;
  const orderId = (sale.data as { id: string }).id;
  const item = await admin.from("order_items").select("id").eq("order_id", orderId).single();
  return { orderId, itemId: item.data!.id };
}

beforeAll(async () => {
  const email = `ret-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  userId = cu.data.user.id;
  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
  orgId = (await client.rpc("create_organization", { p_org_name: `Ret ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
  const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
  const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: PRICE, cost: 120000 }).select("id").single();
  variantId = v.data!.id;
  await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 50 });
  const cust = await admin.from("customers").insert({ org_id: orgId, name: "KH nợ" }).select("id").single();
  customerId = cust.data!.id;
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("Đổi/trả hàng", () => {
  it("đơn trả tiền mặt: hoàn tồn + hoàn tiền mặt + ghi sổ quỹ", async () => {
    const { orderId, itemId } = await newSale(2, 2 * PRICE, null);
    const before = await invQty();
    const r = await client.rpc("create_return", {
      p_order: orderId, p_items: [{ order_item_id: itemId, qty: 1, restock: true }], p_reason: "Khách đổi ý",
    });
    expect(r.error).toBeNull();
    const res = r.data as { subtotal: number; refund_cash: number; debt_reduced: number; id: string };
    expect(res.subtotal).toBe(PRICE);
    expect(res.refund_cash).toBe(PRICE);
    expect(res.debt_reduced).toBe(0);
    expect(await invQty()).toBe(before + 1); // hoàn tồn

    const led = await admin.from("cash_ledger").select("direction, amount, category").eq("ref_id", res.id).single();
    expect(led.data!.direction).toBe("out");
    expect(led.data!.amount).toBe(PRICE);
    expect(led.data!.category).toBe("hoan_tra");
  });

  it("trả không nhập kho (restock=false): tồn không đổi", async () => {
    const { orderId, itemId } = await newSale(1, PRICE, null);
    const before = await invQty();
    const r = await client.rpc("create_return", {
      p_order: orderId, p_items: [{ order_item_id: itemId, qty: 1, restock: false }], p_reason: "Hàng lỗi",
    });
    expect(r.error).toBeNull();
    expect((r.data as { refund_cash: number }).refund_cash).toBe(PRICE);
    expect(await invQty()).toBe(before); // không nhập lại kho
  });

  it("không trả vượt số đã bán", async () => {
    const { orderId, itemId } = await newSale(1, PRICE, null);
    const r = await client.rpc("create_return", {
      p_order: orderId, p_items: [{ order_item_id: itemId, qty: 2, restock: true }], p_reason: null,
    });
    expect(r.error).not.toBeNull();
    expect(r.error?.message).toContain("vượt");
  });

  it("đơn ghi nợ: trả hàng giảm công nợ trước, không hoàn tiền mặt", async () => {
    const { orderId, itemId } = await newSale(1, 0, customerId); // nợ toàn bộ
    const debtBefore = (await admin.from("customers").select("debt").eq("id", customerId).single()).data!.debt as number;
    expect(debtBefore).toBeGreaterThanOrEqual(PRICE);
    const r = await client.rpc("create_return", {
      p_order: orderId, p_items: [{ order_item_id: itemId, qty: 1, restock: true }], p_reason: null,
    });
    expect(r.error).toBeNull();
    const res = r.data as { refund_cash: number; debt_reduced: number };
    expect(res.debt_reduced).toBe(PRICE);
    expect(res.refund_cash).toBe(0);
    const debtAfter = (await admin.from("customers").select("debt").eq("id", customerId).single()).data!.debt as number;
    expect(debtAfter).toBe(debtBefore - PRICE);
  });
});
