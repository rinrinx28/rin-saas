-- 0026 — Cấu hình HĐĐT per-tenant (ADR 0008). Chọn nhà cung cấp + thông tin
-- người bán + ký hiệu/mẫu số + credentials API. Chứa secret → chỉ quản lý.
-- Provider thật cắm sau; mặc định stub vẫn chạy.

create table public.einvoice_config (
  org_id          uuid primary key references public.organizations (id) on delete cascade,
  provider        text not null default 'stub',
  enabled         boolean not null default false,
  seller_tax_code text,                 -- MST người bán
  seller_name     text,                 -- tên đơn vị (pháp nhân)
  seller_address  text,
  template_no     text,                 -- mẫu số (vd 1)
  series          text,                 -- ký hiệu (vd C26TYY)
  api_endpoint    text,
  api_username    text,
  api_secret      text,                 -- mật khẩu/token API (secret)
  updated_at      timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.einvoice_config enable row level security;

-- Cấu hình chứa credentials → chỉ quản lý (owner/admin) xem & sửa.
create policy "einvoice_config_manage" on public.einvoice_config
  for all to authenticated
  using (public.my_role(org_id) in ('owner', 'admin'))
  with check (public.my_role(org_id) in ('owner', 'admin'));
