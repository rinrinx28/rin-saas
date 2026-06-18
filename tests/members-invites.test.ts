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

interface User {
  id: string;
  email: string;
  client: SupabaseClient;
}

async function mkUser(tag: string): Promise<User> {
  const email = `mi-${tag}-${STAMP}@example.com`;
  const cu = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (cu.error) throw cu.error;
  const client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  if ((await client.auth.signInWithPassword({ email, password: PASSWORD })).error) throw new Error("signin " + tag);
  return { id: cu.data.user.id, email, client };
}

let owner: User;
let orgId: string;
let cn1: string;
let cn2: string;
const cleanupUsers: string[] = [];

beforeAll(async () => {
  owner = await mkUser("owner");
  cleanupUsers.push(owner.id);
  orgId = (await owner.client.rpc("create_organization", { p_org_name: `MI ${STAMP}`, p_store_name: "CN1", p_store_address: null })).data as string;
  // Gói Doanh nghiệp (∞ ghế) để test logic vai trò/chi nhánh không vướng trần nhân
  // viên. Việc enforce trần ghế được kiểm riêng ở tests/subscription.test.ts.
  await admin.from("organizations").update({ plan: "business" }).eq("id", orgId);
  cn1 = (await owner.client.from("stores").select("id").eq("org_id", orgId).single()).data!.id;
  cn2 = (await admin.from("stores").insert({ org_id: orgId, name: "CN2" }).select("id").single()).data!.id;
}, 60000);

afterAll(async () => {
  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  for (const id of cleanupUsers) await admin.auth.admin.deleteUser(id);
}, 60000);

describe("Mời nhân viên + đồng ý/từ chối + gán chi nhánh", () => {
  it("owner mời nhân viên (staff, CN1) → có lời mời pending", async () => {
    const b = await mkUser("b");
    cleanupUsers.push(b.id);
    const inv = await owner.client.rpc("invite_member", { p_org: orgId, p_email: b.email, p_role: "staff", p_store: cn1 });
    expect(inv.error).toBeNull();
    const orgInv = await owner.client.rpc("list_org_invites", { p_org: orgId });
    expect((orgInv.data as unknown[]).length).toBeGreaterThanOrEqual(1);

    // B thấy lời mời + đồng ý → thành thành viên staff CN1
    const mine = await b.client.rpc("list_invites_for_me");
    const list = mine.data as { id: string; org_id: string; role: string; store_id: string }[];
    expect(list.length).toBe(1);
    expect(list[0]).toMatchObject({ org_id: orgId, role: "staff", store_id: cn1 });
    const acc = await b.client.rpc("accept_invite", { p_invite: list[0].id });
    expect(acc.error).toBeNull();

    const members = await owner.client.rpc("list_members", { p_org: orgId });
    const bm = (members.data as { email: string; role: string; store_id: string }[]).find((m) => m.email === b.email);
    expect(bm).toMatchObject({ role: "staff", store_id: cn1 });
  });

  it("từ chối lời mời → không thành thành viên", async () => {
    const g = await mkUser("g");
    cleanupUsers.push(g.id);
    await owner.client.rpc("invite_member", { p_org: orgId, p_email: g.email, p_role: "staff", p_store: cn1 });
    const mine = await g.client.rpc("list_invites_for_me");
    const inv = (mine.data as { id: string }[])[0];
    await g.client.rpc("decline_invite", { p_invite: inv.id });
    expect((await g.client.rpc("list_invites_for_me")).data).toHaveLength(0);
    const members = await owner.client.rpc("list_members", { p_org: orgId });
    expect((members.data as { email: string }[]).some((m) => m.email === g.email)).toBe(false);
  });

  it("quản lý chi nhánh chỉ mời staff vào chi nhánh mình", async () => {
    const c = await mkUser("c");
    cleanupUsers.push(c.id);
    const invC = await owner.client.rpc("invite_member", { p_org: orgId, p_email: c.email, p_role: "store_manager", p_store: cn2 });
    expect(invC.error).toBeNull();
    const cInv = (await c.client.rpc("list_invites_for_me")).data as { id: string }[];
    expect(cInv.length).toBe(1);
    const accC = await c.client.rpc("accept_invite", { p_invite: cInv[0].id });
    expect(accC.error).toBeNull();

    // C mời staff vào CN2 (của mình) → ok
    const ok = await c.client.rpc("invite_member", { p_org: orgId, p_email: `mi-d-${STAMP}@example.com`, p_role: "staff", p_store: cn2 });
    expect(ok.error).toBeNull();
    // C mời staff vào CN1 (không phải của mình) → lỗi
    const wrongStore = await c.client.rpc("invite_member", { p_org: orgId, p_email: `mi-e-${STAMP}@example.com`, p_role: "staff", p_store: cn1 });
    expect(wrongStore.error).not.toBeNull();
    // C mời admin → lỗi
    const wrongRole = await c.client.rpc("invite_member", { p_org: orgId, p_email: `mi-f-${STAMP}@example.com`, p_role: "admin", p_store: null });
    expect(wrongRole.error).not.toBeNull();
  });

  it("không mời lại người đã là thành viên + đổi vai trò/chi nhánh", async () => {
    const members = await owner.client.rpc("list_members", { p_org: orgId });
    const bm = (members.data as { id: string; email: string }[]).find((m) => m.email.includes("mi-b-"));
    // mời lại B → lỗi đã là thành viên
    const dup = await owner.client.rpc("invite_member", { p_org: orgId, p_email: bm!.email, p_role: "staff", p_store: cn1 });
    expect(dup.error?.message).toContain("thành viên");

    // đổi B sang admin (toàn cửa hàng) → store_id null
    const upd = await owner.client.rpc("update_member", { p_membership: bm!.id, p_role: "admin", p_store: null });
    expect(upd.error).toBeNull();
    const after = await owner.client.rpc("list_members", { p_org: orgId });
    const bm2 = (after.data as { id: string; role: string; store_id: string | null }[]).find((m) => m.id === bm!.id);
    expect(bm2).toMatchObject({ role: "admin", store_id: null });
  });
});
