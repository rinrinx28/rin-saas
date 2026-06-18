-- 0034 — Thực thi trần nhân viên theo gói ở tầng RPC (server-side). Phase 4 / ADR 0014.
--
-- Lý do: luồng nhân sự gồm 2 bước (mời → đồng ý). Kiểm tra giới hạn ở app-layer
-- (lib/limits.ts) dễ rò: lời mời pending không được tính nên có thể gửi nhiều
-- lời mời khi org mới 1 thành viên, rồi đồng ý hàng loạt → vượt trần.
-- Chốt cứng (hard cap) ngay trong RPC `invite_member` + `accept_invite` (atomic,
-- security definer, tôn trọng RLS). App-layer vẫn giữ để phản hồi sớm cho UX.
--
-- Số trần PHẢI khớp lib/plans.ts (free=2, pro=10, business=∞) — có test drift-guard
-- trong tests/subscription.test.ts đối chiếu org_member_limit() với PLANS.

-- ── Trần nhân viên hiệu lực của org ───────────────────────────
-- Đã tính hết hạn gói: gói trả phí quá hạn → coi như free (khớp effectivePlan).
-- NULL = không giới hạn (gói Doanh nghiệp còn hiệu lực).
create or replace function public.org_member_limit(p_org uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select case
    when o.plan = 'pro'
         and (o.plan_expires_at is null or o.plan_expires_at >= now()) then 10
    when o.plan = 'business'
         and (o.plan_expires_at is null or o.plan_expires_at >= now()) then null
    -- free, hoặc gói trả phí đã hết hạn → trần của gói miễn phí.
    else 2
  end
  from public.organizations o
  where o.id = p_org;
$$;
grant execute on function public.org_member_limit(uuid) to authenticated;

-- ── Mời thành viên (tạo lời mời chờ) — thêm chốt trần ─────────
create or replace function public.invite_member(
  p_org uuid, p_email text, p_role text, p_store uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_my       text;
  v_my_store uuid;
  v_uid      uuid;
  v_limit    integer;
  v_used     integer;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if p_role not in ('admin', 'store_manager', 'staff') then raise exception 'Vai trò không hợp lệ'; end if;

  select role, store_id into v_my, v_my_store
    from public.memberships where org_id = p_org and user_id = auth.uid();

  -- Phân quyền mời.
  if v_my in ('owner', 'admin') then
    null; -- mời mọi vai trò
  elsif v_my = 'store_manager' then
    if p_role <> 'staff' or p_store is distinct from v_my_store then
      raise exception 'Quản lý chi nhánh chỉ mời nhân viên vào chi nhánh của mình';
    end if;
  else
    raise exception 'Không có quyền';
  end if;

  -- Vai trò theo chi nhánh phải có chi nhánh, đúng org.
  if p_role in ('store_manager', 'staff') then
    if p_store is null then raise exception 'Cần chọn chi nhánh'; end if;
    if not exists (select 1 from public.stores where id = p_store and org_id = p_org) then
      raise exception 'Chi nhánh không thuộc cửa hàng';
    end if;
  end if;

  -- Đã là thành viên?
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is not null and exists (
    select 1 from public.memberships where org_id = p_org and user_id = v_uid
  ) then
    raise exception 'Người này đã là thành viên';
  end if;

  if exists (
    select 1 from public.member_invites
    where org_id = p_org and lower(email) = lower(p_email) and status = 'pending'
  ) then
    raise exception 'Đã có lời mời đang chờ cho email này';
  end if;

  -- Trần nhân viên theo gói: lời mời pending cũng giữ chỗ (1 ghế / lời mời).
  v_limit := public.org_member_limit(p_org);
  if v_limit is not null then
    v_used :=
      (select count(*) from public.memberships where org_id = p_org)
      + (select count(*) from public.member_invites
           where org_id = p_org and status = 'pending');
    if v_used >= v_limit then
      raise exception 'Đã đạt giới hạn nhân viên của gói (%). Nâng cấp gói để thêm.', v_limit;
    end if;
  end if;

  insert into public.member_invites (org_id, email, role, store_id, invited_by)
    values (p_org, lower(p_email), p_role, case when p_role = 'admin' then null else p_store end, auth.uid());
end;
$$;

-- ── Đồng ý lời mời — thêm chốt trần (hard cap cuối cùng) ──────
create or replace function public.accept_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_inv   public.member_invites;
  v_limit integer;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select * into v_inv from public.member_invites where id = p_invite and status = 'pending';
  if v_inv.id is null then raise exception 'Lời mời không tồn tại'; end if;
  if lower(v_inv.email) <> public.my_email() then raise exception 'Không phải lời mời của bạn'; end if;

  if not exists (select 1 from public.memberships where org_id = v_inv.org_id and user_id = auth.uid()) then
    -- Chốt cứng: số thành viên thực không được vượt trần khi đồng ý.
    v_limit := public.org_member_limit(v_inv.org_id);
    if v_limit is not null
       and (select count(*) from public.memberships where org_id = v_inv.org_id) >= v_limit then
      raise exception 'Đã đạt giới hạn nhân viên của gói. Liên hệ chủ cửa hàng nâng cấp gói.';
    end if;

    insert into public.memberships (user_id, org_id, role, store_id)
      values (auth.uid(), v_inv.org_id, v_inv.role, v_inv.store_id);
  end if;
  update public.member_invites set status = 'accepted', responded_at = now() where id = p_invite;
end;
$$;
