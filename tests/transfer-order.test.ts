import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reconcileWebhook } from "../lib/payment/reconcile";
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
const TOKEN = `tok2_${STAMP}`;
const SECRET = `sec2_${STAMP}`;

async function invQty(): Promise<number> {
  const r = await admin.from("inventory").select("qty").eq("variant_id", variantId).single();
  return r.data!.qty as number;
}
async function newTransferOrder(): Promise<{ id: string; code: string; total: number }> {
  const r = await client.rpc("create_transfer_order", {
    p_store: storeId, p_customer: null, p_discount: 0,
    p_items: [{ variant_id: variantId, qty: 1, price: 100000 }],
  });
  if (r.error) throw r.error;
  return r.data as { id: string; code: string; total: number };
}

beforeAll(async () => {
  const email = `txo-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  userId = cu.data.user.id;
  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
  orgId = (await client.rpc("create_organization", { p_org_name: `TxO ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
  await admin.from("payment_integrations").insert({ org_id: orgId, store_id: null, provider: "sepay", webhook_token: TOKEN, webhook_secret: SECRET, enabled: true });
  const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
  const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: 100000, cost: 60000 }).select("id").single();
  variantId = v.data!.id;
  await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 10 });
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("Đơn chờ chuyển khoản", () => {
  it("create_transfer_order: đơn paid=0, trừ tồn, có mã", async () => {
    const before = await invQty();
    const o = await newTransferOrder();
    expect(o.code).toMatch(/^HD/);
    expect(o.total).toBe(100000);
    const order = await admin.from("orders").select("paid, status").eq("id", o.id).single();
    expect(order.data!.paid).toBe(0);
    expect(await invQty()).toBe(before - 1);
  });

  it("webhook đối soát theo mã đơn chờ → đơn được thanh toán đủ", async () => {
    const o = await newTransferOrder();
    const r = await reconcileWebhook("sepay", TOKEN, `Apikey ${SECRET}`, {
      id: `txo-pay-${STAMP}`, transferType: "in", transferAmount: 100000, content: `TT ${o.code}`,
    });
    expect(r.status).toBe("matched");
    const order = await admin.from("orders").select("paid").eq("id", o.id).single();
    expect(order.data!.paid).toBe(100000);
  });

  it("apply_manual_payment: xác nhận tay → đơn thanh toán đủ", async () => {
    const o = await newTransferOrder();
    const r = await client.rpc("apply_manual_payment", { p_order: o.id, p_method: "transfer" });
    expect(r.error).toBeNull();
    const order = await admin.from("orders").select("paid").eq("id", o.id).single();
    expect(order.data!.paid).toBe(100000);
  });

  it("cancel_order: huỷ đơn chưa trả → hoàn tồn + status cancelled", async () => {
    const before = await invQty();
    const o = await newTransferOrder();
    expect(await invQty()).toBe(before - 1);
    const r = await client.rpc("cancel_order", { p_order: o.id });
    expect(r.error).toBeNull();
    expect(await invQty()).toBe(before); // hoàn tồn
    const order = await admin.from("orders").select("status").eq("id", o.id).single();
    expect(order.data!.status).toBe("cancelled");
  });

  it("không huỷ được đơn đã thanh toán", async () => {
    const o = await newTransferOrder();
    await client.rpc("apply_manual_payment", { p_order: o.id, p_method: "transfer" });
    const r = await client.rpc("cancel_order", { p_order: o.id });
    expect(r.error).not.toBeNull();
    expect(r.error?.message).toContain("đã thanh toán");
  });
});
