-- 0019 — Nhân sự: gán chi nhánh + vai trò store_manager + lời mời. ADR 0011.

-- Gán chi nhánh cho thành viên (null = toàn cửa hàng cho owner/admin).
alter table public.memberships
  add column if not exists store_id uuid references public.stores (id) on delete set null;

-- Bảng lời mời.
create table public.member_invites (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  email        text not null,
  role         text not null check (role in ('admin', 'store_manager', 'staff')),
  store_id     uuid references public.stores (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);
create index member_invites_org_idx on public.member_invites (org_id);
create index member_invites_email_idx on public.member_invites (lower(email));
-- Mỗi org tối đa 1 lời mời pending / email.
create unique index member_invites_pending_uniq
  on public.member_invites (org_id, lower(email)) where status = 'pending';

alter table public.member_invites enable row level security;
-- Quản lý org xem lời mời của org; người dùng xem lời mời gửi cho email mình.
create policy "member_invites_select" on public.member_invites
  for select to authenticated using (
    public.is_org_member(org_id)
    or lower(email) = (select lower(u.email) from auth.users u where u.id = auth.uid())
  );

-- Email của user hiện tại (helper).
create or replace function public.my_email()
returns text language sql security definer stable set search_path = public as $$
  select lower(email) from auth.users where id = auth.uid();
$$;

-- Quyền truy cập một chi nhánh (dùng cho cô lập dữ liệu — Pha 2).
create or replace function public.can_access_store(p_store uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    join public.stores s on s.org_id = m.org_id
    where s.id = p_store and m.user_id = auth.uid()
      and (m.role in ('owner', 'admin') or m.store_id = p_store)
  );
$$;

-- ── Liệt kê thành viên (kèm chi nhánh) ────────────────────────
drop function if exists public.list_members(uuid);
create or replace function public.list_members(p_org uuid)
returns table (id uuid, user_id uuid, role text, email text, store_id uuid, store_name text)
language sql security definer stable set search_path = public as $$
  select m.id, m.user_id, m.role, u.email::text, m.store_id, s.name
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.stores s on s.id = m.store_id
  where m.org_id = p_org and public.is_org_member(p_org)
  order by m.created_at;
$$;

-- ── Mời thành viên (tạo lời mời chờ) ──────────────────────────
create or replace function public.invite_member(
  p_org uuid, p_email text, p_role text, p_store uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_my       text;
  v_my_store uuid;
  v_uid      uuid;
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

  insert into public.member_invites (org_id, email, role, store_id, invited_by)
    values (p_org, lower(p_email), p_role, case when p_role = 'admin' then null else p_store end, auth.uid());
end;
$$;

-- ── Lời mời gửi cho email của tôi ─────────────────────────────
create or replace function public.list_invites_for_me()
returns table (id uuid, org_id uuid, org_name text, role text, store_id uuid, store_name text, invited_at timestamptz)
language sql security definer stable set search_path = public as $$
  select i.id, i.org_id, o.name, i.role, i.store_id, s.name, i.created_at
  from public.member_invites i
  join public.organizations o on o.id = i.org_id
  left join public.stores s on s.id = i.store_id
  where i.status = 'pending' and lower(i.email) = public.my_email()
  order by i.created_at desc;
$$;

-- ── Đồng ý lời mời ────────────────────────────────────────────
create or replace function public.accept_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv public.member_invites;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select * into v_inv from public.member_invites where id = p_invite and status = 'pending';
  if v_inv.id is null then raise exception 'Lời mời không tồn tại'; end if;
  if lower(v_inv.email) <> public.my_email() then raise exception 'Không phải lời mời của bạn'; end if;

  if not exists (select 1 from public.memberships where org_id = v_inv.org_id and user_id = auth.uid()) then
    insert into public.memberships (user_id, org_id, role, store_id)
      values (auth.uid(), v_inv.org_id, v_inv.role, v_inv.store_id);
  end if;
  update public.member_invites set status = 'accepted', responded_at = now() where id = p_invite;
end;
$$;

-- ── Từ chối lời mời ───────────────────────────────────────────
create or replace function public.decline_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv public.member_invites;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select * into v_inv from public.member_invites where id = p_invite and status = 'pending';
  if v_inv.id is null then raise exception 'Lời mời không tồn tại'; end if;
  if lower(v_inv.email) <> public.my_email() then raise exception 'Không phải lời mời của bạn'; end if;
  update public.member_invites set status = 'declined', responded_at = now() where id = p_invite;
end;
$$;

-- ── Lời mời pending của org (cho quản lý xem) ─────────────────
create or replace function public.list_org_invites(p_org uuid)
returns table (id uuid, email text, role text, store_id uuid, store_name text, invited_at timestamptz)
language sql security definer stable set search_path = public as $$
  select i.id, i.email, i.role, i.store_id, s.name, i.created_at
  from public.member_invites i
  left join public.stores s on s.id = i.store_id
  where i.org_id = p_org and i.status = 'pending' and public.is_org_member(p_org)
  order by i.created_at desc;
$$;

-- ── Huỷ lời mời (quản lý org) ─────────────────────────────────
create or replace function public.cancel_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from public.member_invites where id = p_invite;
  if v_org is null then raise exception 'Không tồn tại'; end if;
  if public.my_role(v_org) not in ('owner', 'admin') then raise exception 'Không có quyền'; end if;
  delete from public.member_invites where id = p_invite and status = 'pending';
end;
$$;

-- ── Cập nhật vai trò + chi nhánh của thành viên ───────────────
create or replace function public.update_member(p_membership uuid, p_role text, p_store uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_old text;
begin
  select org_id, role into v_org, v_old from public.memberships where id = p_membership;
  if v_org is null then raise exception 'Không tồn tại'; end if;
  if public.my_role(v_org) not in ('owner', 'admin') then raise exception 'Không có quyền'; end if;
  if p_role not in ('owner', 'admin', 'store_manager', 'staff') then raise exception 'Vai trò không hợp lệ'; end if;

  if v_old = 'owner' and p_role <> 'owner'
     and (select count(*) from public.memberships where org_id = v_org and role = 'owner') <= 1 then
    raise exception 'Phải còn ít nhất một chủ sở hữu';
  end if;
  if p_role in ('store_manager', 'staff') then
    if p_store is null then raise exception 'Cần chọn chi nhánh'; end if;
    if not exists (select 1 from public.stores where id = p_store and org_id = v_org) then
      raise exception 'Chi nhánh không thuộc cửa hàng';
    end if;
  end if;

  update public.memberships
    set role = p_role, store_id = case when p_role in ('store_manager', 'staff') then p_store else null end
    where id = p_membership;
end;
$$;

grant execute on function public.my_email() to authenticated;
grant execute on function public.can_access_store(uuid) to authenticated;
grant execute on function public.invite_member(uuid, text, text, uuid) to authenticated;
grant execute on function public.list_invites_for_me() to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.decline_invite(uuid) to authenticated;
grant execute on function public.list_org_invites(uuid) to authenticated;
grant execute on function public.cancel_invite(uuid) to authenticated;
grant execute on function public.update_member(uuid, text, uuid) to authenticated;
