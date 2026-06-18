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

async function setMode(mode: "carry" | "fixed" | "manual", fixedFloat = 0) {
  await admin.from("organizations").update({ shift_opening_mode: mode, shift_fixed_float: fixedFloat }).eq("id", orgId);
}

beforeAll(async () => {
  const email = `shift-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  userId = cu.data.user.id;
  client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin");
  orgId = (await client.rpc("create_organization", { p_org_name: `Shift ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  storeId = (await client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
  const prod = await admin.from("products").insert({ org_id: orgId, name: "SP" }).select("id").single();
  const v = await admin.from("product_variants").insert({ org_id: orgId, product_id: prod.data!.id, name: "M", price: 200000, cost: 120000 }).select("id").single();
  variantId = v.data!.id;
  await admin.from("inventory").insert({ org_id: orgId, store_id: storeId, variant_id: variantId, qty: 50 });
  await setMode("manual"); // các test cơ bản dùng nhập tay
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}, 60000);

describe("Ca bán hàng & sổ quỹ", () => {
  let shiftId: string;

  it("open_shift: mở ca với tiền đầu ca (chế độ nhập tay)", async () => {
    const r = await client.rpc("open_shift", { p_store: storeId, p_definition: null, p_opening_cash: 500000, p_note: "Ca sáng" });
    expect(r.error).toBeNull();
    shiftId = r.data as string;
    const s = await admin.from("shifts").select("status, opening_cash, opening_mode").eq("id", shiftId).single();
    expect(s.data!.status).toBe("open");
    expect(s.data!.opening_cash).toBe(500000);
    expect(s.data!.opening_mode).toBe("manual");
  });

  it("không mở được ca thứ hai khi chi nhánh đang có ca mở", async () => {
    const r = await client.rpc("open_shift", { p_store: storeId, p_definition: null, p_opening_cash: 0, p_note: null });
    expect(r.error).not.toBeNull();
    expect(r.error?.message).toContain("ca mở");
  });

  it("record_cash: phiếu thu & chi gắn vào ca hiện tại", async () => {
    const rin = await client.rpc("record_cash", { p_store: storeId, p_direction: "in", p_category: "thu_khac", p_amount: 100000, p_note: "Thu khác" });
    const rout = await client.rpc("record_cash", { p_store: storeId, p_direction: "out", p_category: "chi_khac", p_amount: 50000, p_note: "Chi khác" });
    expect(rin.error).toBeNull();
    expect(rout.error).toBeNull();
    const rows = await admin.from("cash_ledger").select("direction, amount, shift_id").eq("store_id", storeId);
    expect(rows.data!.length).toBe(2);
    expect(rows.data!.every((r) => r.shift_id === shiftId)).toBe(true);
  });

  it("close_shift: kỳ vọng = đầu ca + bán tiền mặt + thu − chi, tính lệch quỹ", async () => {
    const sale = await client.rpc("create_sale", {
      p_store: storeId, p_customer: null, p_discount: 0,
      p_items: [{ variant_id: variantId, qty: 1, price: 200000 }],
      p_method: "cash", p_paid: 200000,
    });
    expect(sale.error).toBeNull();

    // expected = 500.000 + 200.000(bán) + 100.000(thu) − 50.000(chi) = 750.000
    const r = await client.rpc("close_shift", { p_shift: shiftId, p_counted: 740000, p_note: null });
    expect(r.error).toBeNull();
    const sum = r.data as { expected: number; sales_cash: number; counted: number; diff: number };
    expect(sum.sales_cash).toBe(200000);
    expect(sum.expected).toBe(750000);
    expect(sum.diff).toBe(-10000);

    const s = await admin.from("shifts").select("status, expected_cash, diff").eq("id", shiftId).single();
    expect(s.data!.status).toBe("closed");
    expect(s.data!.expected_cash).toBe(750000);
    expect(s.data!.diff).toBe(-10000);
  });

  it("không chốt lại ca đã chốt", async () => {
    const r = await client.rpc("close_shift", { p_shift: shiftId, p_counted: 0, p_note: null });
    expect(r.error).not.toBeNull();
    expect(r.error?.message).toContain("đã chốt");
  });
});

describe("Tiền đầu ca theo chế độ", () => {
  it("cuốn chiếu: đầu ca = tiền đếm cuối ca trước (740.000)", async () => {
    await setMode("carry");
    const r = await client.rpc("open_shift", { p_store: storeId, p_definition: null, p_opening_cash: 999999, p_note: null });
    expect(r.error).toBeNull();
    const id = r.data as string;
    const s = await admin.from("shifts").select("opening_cash, opening_mode").eq("id", id).single();
    expect(s.data!.opening_cash).toBe(740000); // p_opening_cash bị bỏ qua
    expect(s.data!.opening_mode).toBe("carry");
    await client.rpc("close_shift", { p_shift: id, p_counted: 740000, p_note: null });
  });

  it("định mức: đầu ca = quỹ lẻ cố định (1.000.000)", async () => {
    await setMode("fixed", 1000000);
    const r = await client.rpc("open_shift", { p_store: storeId, p_definition: null, p_opening_cash: 0, p_note: null });
    expect(r.error).toBeNull();
    const id = r.data as string;
    const s = await admin.from("shifts").select("opening_cash").eq("id", id).single();
    expect(s.data!.opening_cash).toBe(1000000);
    await client.rpc("close_shift", { p_shift: id, p_counted: 1000000, p_note: null });
  });

  it("chốt ca đếm theo mệnh giá: tổng = Σ mệnh_giá × số_tờ", async () => {
    await setMode("manual");
    const open = await client.rpc("open_shift", { p_store: storeId, p_definition: null, p_opening_cash: 0, p_note: null });
    const id = open.data as string;
    // 2×200.000 + 1×50.000 = 450.000
    const r = await client.rpc("close_shift", {
      p_shift: id, p_counted: 0, p_note: null,
      p_breakdown: { "200000": 2, "50000": 1 },
    });
    expect(r.error).toBeNull();
    expect((r.data as { counted: number }).counted).toBe(450000);
    const s = await admin.from("shifts").select("closing_cash_counted, closing_breakdown").eq("id", id).single();
    expect(s.data!.closing_cash_counted).toBe(450000);
    expect(s.data!.closing_breakdown).toEqual({ "200000": 2, "50000": 1 });
  });
});

describe("Định nghĩa ca (kế thừa & ghi đè)", () => {
  it("kế thừa bộ mặc định cửa hàng khi chi nhánh chưa có bộ riêng", async () => {
    await admin.from("shift_definitions").insert({ org_id: orgId, store_id: null, name: "Ca sáng (CH)" });
    const r = await client.rpc("effective_shift_definitions", { p_store: storeId });
    expect(r.error).toBeNull();
    const names = (r.data as { name: string }[]).map((d) => d.name);
    expect(names).toContain("Ca sáng (CH)");
  });

  it("chi nhánh có bộ riêng thì ghi đè bộ cửa hàng", async () => {
    await admin.from("shift_definitions").insert({ org_id: orgId, store_id: storeId, name: "Ca CN" });
    const r = await client.rpc("effective_shift_definitions", { p_store: storeId });
    const names = (r.data as { name: string }[]).map((d) => d.name);
    expect(names).toEqual(["Ca CN"]); // chỉ còn bộ riêng của chi nhánh
  });

  it("mở ca gắn định nghĩa → snapshot tên ca", async () => {
    const def = await admin.from("shift_definitions").select("id").eq("store_id", storeId).single();
    const open = await client.rpc("open_shift", { p_store: storeId, p_definition: def.data!.id, p_opening_cash: 0, p_note: null });
    expect(open.error).toBeNull();
    const id = open.data as string;
    const s = await admin.from("shifts").select("shift_name, definition_id").eq("id", id).single();
    expect(s.data!.shift_name).toBe("Ca CN");
    await client.rpc("close_shift", { p_shift: id, p_counted: 0, p_note: null });
  });
});
