-- 0001 — Nền multi-tenant: organizations, memberships, stores + RLS
-- ADR: build spec (multi-tenant = shared DB + RLS), ADR 0005 (Phase 1)

create extension if not exists "pgcrypto";

-- ── Bảng ──────────────────────────────────────────────────────
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at  timestamptz not null default now(),
  unique (user_id, org_id)
);
create index memberships_org_id_idx on public.memberships (org_id);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  address     text,
  created_at  timestamptz not null default now()
);
create index stores_org_id_idx on public.stores (org_id);

-- ── Helper: kiểm tra thành viên (security definer → tránh đệ quy RLS) ──
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

-- ── RLS: bật cho mọi bảng ─────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.memberships  enable row level security;
alter table public.stores       enable row level security;

-- organizations: chỉ thành viên đọc/sửa; tạo qua RPC create_organization
create policy "org_select_member" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "org_update_member" on public.organizations
  for update to authenticated
  using (public.is_org_member(id)) with check (public.is_org_member(id));

-- memberships: đọc bản thân + đồng nghiệp cùng org (thêm thành viên: Phase 3 RBAC)
create policy "membership_select" on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));

-- stores: thành viên CRUD trong org của mình
create policy "store_select_member" on public.stores
  for select to authenticated using (public.is_org_member(org_id));
create policy "store_insert_member" on public.stores
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "store_update_member" on public.stores
  for update to authenticated
  using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "store_delete_member" on public.stores
  for delete to authenticated using (public.is_org_member(org_id));

-- ── RPC: tạo org + owner membership + store đầu tiên (atomic) ──
create or replace function public.create_organization(
  p_org_name      text,
  p_store_name    text,
  p_store_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  insert into public.organizations (name)
    values (p_org_name) returning id into v_org;

  insert into public.memberships (user_id, org_id, role)
    values (v_uid, v_org, 'owner');

  insert into public.stores (org_id, name, address)
    values (v_org, p_store_name, nullif(p_store_address, ''));

  return v_org;
end;
$$;

-- ── Quyền thực thi ────────────────────────────────────────────
grant execute on function public.is_org_member(uuid) to authenticated, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;
