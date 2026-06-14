-- 0020 — Cho phép vai trò store_manager trong memberships. ADR 0011.
alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships
  add constraint memberships_role_check
  check (role in ('owner', 'admin', 'store_manager', 'staff'));
