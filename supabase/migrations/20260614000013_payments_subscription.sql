-- 0013 — Thanh toán gói cước qua chuyển khoản + đối soát (SePay/Casso). Phase 4 / VN-specific.

alter table public.organizations add column plan_expires_at timestamptz;

create table public.payment_requests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  plan        text not null check (plan in ('pro', 'business')),
  amount      integer not null,
  memo        text not null unique,
  status      text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  provider    text not null default 'sepay',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index payment_requests_org_id_idx on public.payment_requests (org_id);
create index payment_requests_memo_idx on public.payment_requests (memo);

alter table public.payment_requests enable row level security;

-- Thành viên xem yêu cầu của org mình; tạo (insert) qua action có kiểm tra quản lý.
-- Cập nhật (đối soát) đi qua service role ở webhook → bỏ qua RLS.
create policy "payment_requests_select" on public.payment_requests
  for select to authenticated using (public.is_org_member(org_id));
create policy "payment_requests_insert" on public.payment_requests
  for insert to authenticated with check (public.is_org_member(org_id));
