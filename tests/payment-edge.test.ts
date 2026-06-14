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
let customerId: string;

// Tạo 1 biến thể có sẵn tồn `stock`, giá `price`. Trả variantId.
async function makeVariant(price: number, stock: number): Promise<string> {
  const product = await client
    .from("products")
    .insert({ org_id: orgId, name: `SP ${Math.round(price)}-${stock}`, is_active: true })
    .select("id")
    .single();
  if (product.error) throw product.error;
  const variant = await client
    .from("product_variants")
    .insert({ org_id: orgId, product_id: product.data.id, name: "Mặc định", price, cost: 0 })
    .select("id")
    .single();
  if (variant.error) throw variant.error;
  if (stock > 0) {
    const recv = await client.rpc("receive_purchase", {
      p_store: storeId,
      p_supplier: null,
      p_note: null,
      p_items: [{ variant_id: variant.data.id, qty: stock, cost: 0 }],
      p_paid: 0,
    });
    if (recv.error) throw recv.error;
  }
  return variant.data.id;
}

async function stockOf(variantId: string): Promise<number> {
  const r = await admin
    .from("inventory")
    .select("qty")
    .eq("store_id", storeId)
    .eq("variant_id", variantId)
    .maybeSingle();
  return r.data?.qty ?? 0;
}

beforeAll(async () => {
  const email = `payedge-${STAMP}@example.com`;
  const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;

  orgId = (await client.rpc("create_organization", {
    p_org_name: `PayEdge ${STAMP}`,
    p_store_name: "CN Test",
    p_store_address: null,
  })).data as string;
  storeId = (await client.from("stores").select("id").eq("org_id", orgId)).data![0].id;
  customerId = (await client
    .from("customers")
    .insert({ org_id: orgId, name: "Khách Nợ" })
    .select("id")
    .single()).data!.id;
}, 60000);

afterAll(async () => {
  // Dọn sạch: xóa org (cascade mọi bảng) + user
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("Edge case thanh toán & hóa đơn", () => {
  it("1. Chiết khấu ≥ tổng → total = 0, không âm", async () => {
    const v = await makeVariant(30000, 5);
    const { data, error } = await client.rpc("create_sale", {
      p_store: storeId,
      p_customer: null,
      p_discount: 50000, // > subtotal 30000
      p_items: [{ variant_id: v, qty: 1, price: 30000 }],
      p_method: "cash",
      p_paid: 0,
    });
    expect(error).toBeNull();
    const order = await admin
      .from("orders")
      .select("subtotal, discount, total, paid")
      .eq("id", (data as { id: string }).id)
      .single();
    expect(order.data?.subtotal).toBe(30000);
    expect(order.data?.total).toBe(0);
    expect(order.data?.paid).toBe(0);
    expect(await stockOf(v)).toBe(4); // vẫn trừ kho
  });

  it("2. Ghi nợ mà không chọn khách → bị chặn, không tạo đơn/trừ kho", async () => {
    const v = await makeVariant(20000, 5);
    const { error } = await client.rpc("create_sale", {
      p_store: storeId,
      p_customer: null,
      p_discount: 0,
      p_items: [{ variant_id: v, qty: 1, price: 20000 }],
      p_method: "cash",
      p_paid: 10000, // thiếu, không có khách
    });
    expect(error).not.toBeNull();
    expect(await stockOf(v)).toBe(5); // không trừ kho
  });

  it("3. Một biến thể 2 dòng vượt tồn → rollback, không bán âm", async () => {
    const v = await makeVariant(15000, 1);
    const { error } = await client.rpc("create_sale", {
      p_store: storeId,
      p_customer: null,
      p_discount: 0,
      p_items: [
        { variant_id: v, qty: 1, price: 15000 },
        { variant_id: v, qty: 1, price: 15000 }, // tổng 2 > tồn 1
      ],
      p_method: "cash",
      p_paid: 30000,
    });
    expect(error).not.toBeNull();
    expect(await stockOf(v)).toBe(1); // rollback nguyên vẹn
  });

  it("4. Trả dư tiền mặt → paid lưu = tổng (clamp), không nợ âm", async () => {
    const v = await makeVariant(20000, 5);
    const { data, error } = await client.rpc("create_sale", {
      p_store: storeId,
      p_customer: null,
      p_discount: 0,
      p_items: [{ variant_id: v, qty: 1, price: 20000 }],
      p_method: "cash",
      p_paid: 50000, // đưa dư
    });
    expect(error).toBeNull();
    const order = await admin
      .from("orders")
      .select("total, paid")
      .eq("id", (data as { id: string }).id)
      .single();
    expect(order.data?.total).toBe(20000);
    expect(order.data?.paid).toBe(20000); // clamp, không lưu 50000
  });

  it("6. Toàn vẹn hóa đơn: tổng dòng = subtotal, subtotal − discount = total, trừ kho khớp", async () => {
    const a = await makeVariant(10000, 10);
    const b = await makeVariant(25000, 10);
    const { data, error } = await client.rpc("create_sale", {
      p_store: storeId,
      p_customer: customerId,
      p_discount: 5000,
      p_items: [
        { variant_id: a, qty: 2, price: 10000 },
        { variant_id: b, qty: 1, price: 25000 },
      ],
      p_method: "cash",
      p_paid: 40000,
    });
    expect(error).toBeNull();
    const orderId = (data as { id: string }).id;
    const order = await admin
      .from("orders")
      .select("subtotal, discount, total")
      .eq("id", orderId)
      .single();
    const items = await admin.from("order_items").select("qty, total").eq("order_id", orderId);
    const sumItems = (items.data ?? []).reduce((s, i) => s + i.total, 0);

    expect(sumItems).toBe(order.data!.subtotal); // 45000
    expect(order.data!.subtotal).toBe(45000);
    expect(order.data!.subtotal - order.data!.discount).toBe(order.data!.total); // 40000
    expect(await stockOf(a)).toBe(8);
    expect(await stockOf(b)).toBe(9);
  });
});
