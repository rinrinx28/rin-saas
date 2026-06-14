import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBankQrUrl, effectiveBank, hasBank, transferMemo } from "../lib/payment/bank-qr";
import { findBank, VN_BANKS } from "../lib/payment/vn-banks";
import { loadEnv } from "./helpers/env";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "matkhau-test-12345";
const STAMP = Date.now();

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

describe("QR/bank (đơn vị)", () => {
  const org = { name: "Vietcombank", account: "0011000123456", holder: "CUA HANG A" };

  it("effectiveBank: chi nhánh ghi đè cửa hàng khi có số tài khoản", () => {
    const store = { name: "ACB", account: "999888", holder: "CN1" };
    expect(effectiveBank(org, store)).toEqual(store);
    expect(effectiveBank(org, { name: null, account: null, holder: null })).toEqual(org);
    expect(effectiveBank(org, null)).toEqual(org);
  });

  it("buildBankQrUrl: dùng template qronly (không logo), null khi thiếu TK", () => {
    const url = buildBankQrUrl(org, 50000, "TT HD001");
    expect(url).toContain("qr.sepay.vn/img");
    expect(url).toContain("template=qronly");
    expect(url).not.toContain("compact");
    expect(url).toContain("amount=50000");
    expect(buildBankQrUrl({ name: null, account: null, holder: null }, 1000, "x")).toBeNull();
  });

  it("transferMemo: ASCII không dấu", () => {
    expect(transferMemo("HD250614-01")).toBe("TT HD250614-01");
    expect(hasBank(org)).toBe(true);
  });

  it("danh sách ngân hàng VN: mỗi mục có logo + BIN; findBank theo shortName", () => {
    expect(VN_BANKS.length).toBeGreaterThan(30);
    for (const b of VN_BANKS) {
      expect(b.logo).toMatch(/^https:\/\//);
      expect(b.bin).toMatch(/^\d{6}$/);
      expect(b.shortName).toBeTruthy();
    }
    const vcb = findBank("Vietcombank");
    expect(vcb?.bin).toBe("970436");
    expect(vcb?.logo).toContain("cdn.vietqr.io");
    expect(findBank("KhongCoNganHang")).toBeNull();
  });
});

describe("Thanh toán (cloud): lưu TK + mở rộng method", () => {
  let userId: string;
  let orgId: string;
  let client: SupabaseClient;
  let storeId: string;
  let variantId: string;

  beforeAll(async () => {
    const email = `pay-${STAMP}@example.com`;
    const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (cu.error) throw cu.error;
    userId = cu.data.user.id;

    client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
    if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
    const org = await client.rpc("create_organization", { p_org_name: `Pay ${STAMP}`, p_store_name: "CN1", p_store_address: null });
    if (org.error) throw org.error;
    orgId = org.data as string;
    storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;

    const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
    const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: 50000, cost: 30000 }).select("id").single();
    variantId = v.data!.id;
    await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 10 });
  }, 60000);

  afterAll(async () => {
    if (orgId) await admin.from("organizations").delete().eq("id", orgId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 60000);

  it("lưu tài khoản nhận tiền cho org và đọc lại được", async () => {
    const upd = await client
      .from("organizations")
      .update({ bank_name: "Vietcombank", bank_account: "0011000123456", bank_holder: "CUA HANG A" })
      .eq("id", orgId);
    expect(upd.error).toBeNull();
    const { data } = await client.from("organizations").select("bank_account").eq("id", orgId).single();
    expect(data!.bank_account).toBe("0011000123456");
  });

  it("create_sale chấp nhận method 'momo' (enum đã mở rộng)", async () => {
    const sale = await client.rpc("create_sale", {
      p_store: storeId, p_customer: null, p_discount: 0,
      p_items: [{ variant_id: variantId, qty: 1, price: 50000 }],
      p_method: "momo", p_paid: 50000,
    });
    expect(sale.error).toBeNull();
    const orderId = (sale.data as { id: string }).id;
    const { data: pay } = await client.from("payments").select("method").eq("order_id", orderId).single();
    expect(pay!.method).toBe("momo");
  });

  it("create_sale với method 'transfer' vẫn hoạt động", async () => {
    const sale = await client.rpc("create_sale", {
      p_store: storeId, p_customer: null, p_discount: 0,
      p_items: [{ variant_id: variantId, qty: 1, price: 50000 }],
      p_method: "transfer", p_paid: 50000,
    });
    expect(sale.error).toBeNull();
  });
});
