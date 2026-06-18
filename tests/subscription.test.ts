import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmPayment } from "../lib/billing/activate";
import { effectivePlan, PLANS } from "../lib/plans";
import { loadEnv } from "./helpers/env";

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "matkhau-test-12345";
const STAMP = Date.now();
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

interface User {
  id: string;
  email: string;
  client: SupabaseClient;
}

async function mkUser(tag: string): Promise<User> {
  const email = `sub-${tag}-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  const client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin " + tag);
  return { id: cu.data.user.id, email, client };
}

async function mkOrg(owner: User, name: string): Promise<string> {
  const r = await owner.client.rpc("create_organization", { p_org_name: name, p_store_name: "CN1", p_store_address: null });
  if (r.error) throw r.error;
  return r.data as string;
}

let owner: User;
const cleanupOrgs: string[] = [];
const cleanupUsers: string[] = [];

beforeAll(async () => {
  owner = await mkUser("owner");
  cleanupUsers.push(owner.id);
}, 60000);

afterAll(async () => {
  // payment_requests & member_invites cascade theo org → xoá org là đủ.
  for (const id of cleanupOrgs) await admin.from("organizations").delete().eq("id", id);
  for (const id of cleanupUsers) await admin.auth.admin.deleteUser(id);
}, 60000);

// ─────────────────────────────────────────────────────────────
describe("effectivePlan — đơn vị (logic hết hạn gói)", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  it("free luôn là free", () => {
    expect(effectivePlan("free", null)).toBe("free");
  });
  it("gói trả phí còn hạn → giữ nguyên", () => {
    expect(effectivePlan("pro", future)).toBe("pro");
    expect(effectivePlan("business", future)).toBe("business");
  });
  it("gói trả phí quá hạn → tụt về free", () => {
    expect(effectivePlan("pro", past)).toBe("free");
    expect(effectivePlan("business", past)).toBe("free");
  });
  it("null / không hợp lệ → free", () => {
    expect(effectivePlan(null, null)).toBe("free");
    expect(effectivePlan(undefined, future)).toBe("free");
    expect(effectivePlan("bogus", future)).toBe("free");
  });
});

// ─────────────────────────────────────────────────────────────
describe("confirmPayment — đối soát kích hoạt gói (cloud)", () => {
  let orgId: string;

  beforeAll(async () => {
    orgId = await mkOrg(owner, `SUB pay ${STAMP}`);
    cleanupOrgs.push(orgId);
  }, 60000);

  async function newRequest(plan: "pro" | "business", memoTag: string): Promise<string> {
    const memo = `RINTEST${memoTag}${STAMP}`.toUpperCase().slice(0, 24);
    const r = await admin
      .from("payment_requests")
      .insert({ org_id: orgId, plan, amount: PLANS[plan].price, memo, created_by: owner.id })
      .select("memo")
      .single();
    if (r.error) throw r.error;
    return r.data!.memo as string;
  }

  it("đủ tiền → đánh dấu paid + nâng gói + đặt hạn ~30 ngày", async () => {
    const memo = await newRequest("pro", "OK");
    const res = await confirmPayment(memo, PLANS.pro.price);
    expect(res.ok).toBe(true);

    const { data: org } = await admin
      .from("organizations").select("plan, plan_expires_at").eq("id", orgId).single();
    expect(org!.plan).toBe("pro");
    const ms = new Date(org!.plan_expires_at as string).getTime() - Date.now();
    expect(ms).toBeGreaterThan(29 * 86400000);
    expect(ms).toBeLessThan(31 * 86400000);

    const { data: req } = await admin
      .from("payment_requests").select("status, paid_at").eq("memo", memo).single();
    expect(req!.status).toBe("paid");
    expect(req!.paid_at).not.toBeNull();
  });

  it("idempotent: gọi lại memo đã paid → vẫn ok, không đổi gì", async () => {
    const memo = await newRequest("pro", "IDEM");
    await confirmPayment(memo, PLANS.pro.price);
    const { data: before } = await admin
      .from("payment_requests").select("paid_at").eq("memo", memo).single();
    const res = await confirmPayment(memo, PLANS.pro.price);
    expect(res.ok).toBe(true);
    const { data: after } = await admin
      .from("payment_requests").select("paid_at").eq("memo", memo).single();
    expect(after!.paid_at).toBe(before!.paid_at);
  });

  it("thiếu tiền → từ chối, không nâng gói", async () => {
    // Hạ về free trước để chắc chắn quan sát được "không nâng".
    await admin.from("organizations").update({ plan: "free", plan_expires_at: null }).eq("id", orgId);
    const memo = await newRequest("business", "LOW");
    const res = await confirmPayment(memo, 1000);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("amount_too_low");
    const { data: org } = await admin.from("organizations").select("plan").eq("id", orgId).single();
    expect(org!.plan).toBe("free");
  });

  it("memo không tồn tại → từ chối", async () => {
    const res = await confirmPayment(`RINKHONGCO${STAMP}`, 199000);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("memo_not_found");
  });
});

// ─────────────────────────────────────────────────────────────
describe("Trần nhân viên — enforce ở RPC (cloud)", () => {
  let orgId: string;
  let cn1: string;
  let userB: User;
  let userC: User;

  beforeAll(async () => {
    orgId = await mkOrg(owner, `SUB seats ${STAMP}`); // gói free: trần 2 (owner = 1)
    cleanupOrgs.push(orgId);
    cn1 = (await owner.client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
    userB = await mkUser("b");
    userC = await mkUser("c");
    cleanupUsers.push(userB.id, userC.id);
  }, 60000);

  it("org_member_limit khớp PLANS (drift-guard) + tính hết hạn", async () => {
    const call = async () => (await owner.client.rpc("org_member_limit", { p_org: orgId })).data as number | null;
    const future = new Date(Date.now() + 30 * 86400000).toISOString();

    await admin.from("organizations").update({ plan: "free", plan_expires_at: null }).eq("id", orgId);
    expect(await call()).toBe(PLANS.free.limits.members);

    await admin.from("organizations").update({ plan: "pro", plan_expires_at: future }).eq("id", orgId);
    expect(await call()).toBe(PLANS.pro.limits.members);

    await admin.from("organizations").update({ plan: "business", plan_expires_at: future }).eq("id", orgId);
    expect(await call()).toBe(PLANS.business.limits.members); // null = không giới hạn

    // pro đã hết hạn → coi như free.
    await admin
      .from("organizations")
      .update({ plan: "pro", plan_expires_at: new Date(Date.now() - 86400000).toISOString() })
      .eq("id", orgId);
    expect(await call()).toBe(PLANS.free.limits.members);

    // trả về free sạch cho các test sau.
    await admin.from("organizations").update({ plan: "free", plan_expires_at: null }).eq("id", orgId);
  });

  it("free (trần 2): mời 1 ok, mời thêm khi đã đầy ghế (kể cả pending) → chặn", async () => {
    // owner = 1 ghế. Mời B (pending) → 1 + 1 = 2.
    const inv1 = await owner.client.rpc("invite_member", { p_org: orgId, p_email: userB.email, p_role: "staff", p_store: cn1 });
    expect(inv1.error).toBeNull();

    // Mời C khi đã 2 ghế (1 thành viên + 1 pending) → chặn vì lời mời pending cũng tính.
    const inv2 = await owner.client.rpc("invite_member", { p_org: orgId, p_email: userC.email, p_role: "staff", p_store: cn1 });
    expect(inv2.error?.message).toContain("giới hạn nhân viên");
  });

  it("đồng ý lời mời trong trần → ok; vượt trần → chặn ở accept", async () => {
    // B đồng ý: thành viên thật = 1 < 2 → ok → 2 thành viên.
    const myInv = (await userB.client.rpc("list_invites_for_me")).data as { id: string }[];
    const acc = await userB.client.rpc("accept_invite", { p_invite: myInv[0].id });
    expect(acc.error).toBeNull();

    // Giờ 2 thành viên thật. Mời tiếp → chặn ngay ở invite.
    const invFull = await owner.client.rpc("invite_member", { p_org: orgId, p_email: userC.email, p_role: "staff", p_store: cn1 });
    expect(invFull.error?.message).toContain("giới hạn nhân viên");
  });

  it("nâng lên Doanh nghiệp (∞) → mời & đồng ý vượt mốc free thoải mái", async () => {
    await admin
      .from("organizations")
      .update({ plan: "business", plan_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
      .eq("id", orgId);

    const inv = await owner.client.rpc("invite_member", { p_org: orgId, p_email: userC.email, p_role: "staff", p_store: cn1 });
    expect(inv.error).toBeNull();
    const myInv = (await userC.client.rpc("list_invites_for_me")).data as { id: string }[];
    const acc = await userC.client.rpc("accept_invite", { p_invite: myInv[0].id });
    expect(acc.error).toBeNull();

    const members = (await owner.client.rpc("list_members", { p_org: orgId })).data as unknown[];
    expect(members.length).toBe(3); // owner + B + C, vượt trần free (2)
  });
});
