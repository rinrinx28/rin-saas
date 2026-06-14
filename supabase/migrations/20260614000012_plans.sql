-- 0012 — Lớp SaaS: gói cước của tổ chức. Phase 4.
-- Giới hạn theo gói được enforce ở tầng ứng dụng (lib/plans.ts).

alter table public.organizations
  add column plan text not null default 'free'
  check (plan in ('free', 'pro', 'business'));
