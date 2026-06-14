import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractOrderCodeNorm, reconcileWebhook } from "../lib/payment/reconcile";
import { sepayProvider } from "../lib/payment/reconcile/sepay";
import { loadEnv } from "./helpers/env";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "matkhau-test-12345";
const STAMP = Date.now();
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

describe("Đối soát — đơn vị", () => {
  it("sepay verify: đúng/sai secret", () => {
    expect(sepayProvider.verify("Apikey abc", "abc")).toBe(true);
    expect(sepayProvider.verify("Apikey xxx", "abc")).toBe(false);
    expect(sepayProvider.verify(null, "abc")).toBe(false);
  });

  it("sepay parse: chỉ tiền vào, lấy đúng trường", () => {
    expect(sepayProvider.parse({ id: 9, transferType: "out", transferAmount: 100 })).toBeNull();
    expect(sepayProvider.parse({ transferAmount: 100 })).toBeNull();
    const t = sepayProvider.parse({ id: 9, transferType: "in", transferAmount: 5000, accountNumber: "123", content: "TT HD250101-000001" });
    expect(t).toMatchObject({ externalId: "9", amount: 5000, account: "123" });
  });

  it("extractOrderCodeNorm: dò mã HD kể cả khi bank xoá dấu/khoảng trắng", () => {
    expect(extractOrderCodeNorm("TT HD250101-000123 chuyen tien")).toBe("HD250101000123");
    expect(extractOrderCodeNorm("ND tu do")).toBe("");
  });
});

describe("Đối soát — cloud e2e (reconcileWebhook)", () => {
  let userId: string;
  let orgId: string;
  let client: SupabaseClient;
  let storeId: string;
  let variantId: string;
  const TOKEN = `tok_${STAMP}`;
  const SECRET = `sec_${STAMP}`;
  const apikey = `Apikey ${SECRET}`;

  async function newCustomer(name: string): Promise<string> {
    const c = await admin.from("customers").insert({ org_id: orgId, name }).select("id").single();
    return c.data!.id as string;
  }
  async function newOrder(customerId: string): Promise<{ id: string; code: string }> {
    const r = await client.rpc("create_sale", {
      p_store: storeId, p_customer: customerId, p_discount: 0,
      p_items: [{ variant_id: variantId, qty: 1, price: 100000 }],
      p_method: "cash", p_paid: 0,
    });
    if (r.error) throw r.error;
    return { id: (r.data as { id: string }).id, code: (r.data as { code: string }).code };
  }
  const body = (extId: string, amount: number, code: string) => ({
    id: extId, transferType: "in", transferAmount: amount, accountNumber: "9990001", content: `TT ${code}`,
  });

  beforeAll(async () => {
    const email = `recon-${STAMP}@example.com`;
    const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (cu.error) throw cu.error;
    userId = cu.data.user.id;
    client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
    if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
    orgId = (await client.rpc("create_organization", { p_org_name: `Recon ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
    storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
    await admin.from("payment_integrations").insert({ org_id: orgId, store_id: null, provider: "sepay", webhook_token: TOKEN, webhook_secret: SECRET, enabled: true });
    const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
    const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: 100000, cost: 60000 }).select("id").single();
    variantId = v.data!.id;
    await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 50 });
  }, 60000);

  afterAll(async () => {
    if (orgId) await admin.from("organizations").delete().eq("id", orgId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 60000);

  it("đủ tiền → matched, đơn đủ thanh toán, hết nợ", async () => {
    const cust = await newCustomer("KH1");
    const order = await newOrder(cust); // total 100k, paid 0, nợ 100k
    const r = await reconcileWebhook("sepay", TOKEN, apikey, body(`full-${STAMP}`, 100000, order.code));
    expect(r.httpStatus).toBe(200);
    expect(r.status).toBe("matched");
    const o = await admin.from("orders").select("paid").eq("id", order.id).single();
    expect(o.data!.paid).toBe(100000);
    const c = await admin.from("customers").select("debt").eq("id", cust).single();
    expect(c.data!.debt).toBe(0);
  });

  it("trả thiếu → matched, áp đúng phần trả, còn nợ phần còn lại", async () => {
    const cust = await newCustomer("KH2");
    const order = await newOrder(cust);
    const r = await reconcileWebhook("sepay", TOKEN, apikey, body(`part-${STAMP}`, 40000, order.code));
    expect(r.status).toBe("matched");
    const o = await admin.from("orders").select("paid").eq("id", order.id).single();
    expect(o.data!.paid).toBe(40000);
    const c = await admin.from("customers").select("debt").eq("id", cust).single();
    expect(c.data!.debt).toBe(60000);
  });

  it("trùng external_id → duplicate, không áp lần hai", async () => {
    const cust = await newCustomer("KH3");
    const order = await newOrder(cust);
    const ext = `dup-${STAMP}`;
    const r1 = await reconcileWebhook("sepay", TOKEN, apikey, body(ext, 100000, order.code));
    const r2 = await reconcileWebhook("sepay", TOKEN, apikey, body(ext, 100000, order.code));
    expect(r1.status).toBe("matched");
    expect(r2.status).toBe("duplicate");
    const o = await admin.from("orders").select("paid").eq("id", order.id).single();
    expect(o.data!.paid).toBe(100000); // chỉ áp một lần
  });

  it("khớp đúng đơn nhưng đơn đã đủ tiền → already_paid (không áp thêm)", async () => {
    const cust = await newCustomer("KH-ap");
    const order = await newOrder(cust);
    const r1 = await reconcileWebhook("sepay", TOKEN, apikey, body(`ap1-${STAMP}`, 100000, order.code));
    expect(r1.status).toBe("matched");
    const r2 = await reconcileWebhook("sepay", TOKEN, apikey, body(`ap2-${STAMP}`, 100000, order.code));
    expect(r2.status).toBe("already_paid");
    const o = await admin.from("orders").select("paid").eq("id", order.id).single();
    expect(o.data!.paid).toBe(100000); // không cộng dồn lần hai
  });

  it("sai mã đơn → unmatched", async () => {
    const r = await reconcileWebhook("sepay", TOKEN, apikey, body(`nomatch-${STAMP}`, 50000, "HD999999-999999"));
    expect(r.status).toBe("unmatched");
  });

  it("sai secret → unauthorized (401)", async () => {
    const r = await reconcileWebhook("sepay", TOKEN, "Apikey sai", body(`auth-${STAMP}`, 50000, "HD250101-000001"));
    expect(r.httpStatus).toBe(401);
    expect(r.status).toBe("unauthorized");
  });
});
