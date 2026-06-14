-- 0002 — Catalog & tồn kho: categories, products, product_variants,
-- inventory, stock_movements + RLS. (ADR 0005 — Phase 2)
-- Tiền tệ (price/cost) và số lượng (qty) lưu bằng integer (đồng).

-- ── Bảng ──────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  parent_id   uuid references public.categories (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index categories_org_id_idx on public.categories (org_id);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  name         text not null,
  sku          text,
  category_id  uuid references public.categories (id) on delete set null,
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index products_org_id_idx on public.products (org_id);
create index products_category_id_idx on public.products (category_id);

create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  name        text not null default 'Mặc định',
  barcode     text,
  price       integer not null default 0 check (price >= 0),
  cost        integer not null default 0 check (cost >= 0),
  created_at  timestamptz not null default now()
);
create index product_variants_org_id_idx on public.product_variants (org_id);
create index product_variants_product_id_idx on public.product_variants (product_id);

create table public.inventory (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  store_id    uuid not null references public.stores (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  qty         integer not null default 0,
  unique (store_id, variant_id)
);
create index inventory_org_id_idx on public.inventory (org_id);

create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  store_id    uuid not null references public.stores (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  type        text not null check (type in ('in', 'out', 'adjust')),
  qty         integer not null,
  ref_type    text,
  ref_id      uuid,
  note        text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index stock_movements_org_id_idx on public.stock_movements (org_id);
create index stock_movements_variant_id_idx on public.stock_movements (variant_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory        enable row level security;
alter table public.stock_movements  enable row level security;

-- categories
create policy "categories_select" on public.categories
  for select to authenticated using (public.is_org_member(org_id));
create policy "categories_insert" on public.categories
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "categories_update" on public.categories
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "categories_delete" on public.categories
  for delete to authenticated using (public.is_org_member(org_id));

-- products
create policy "products_select" on public.products
  for select to authenticated using (public.is_org_member(org_id));
create policy "products_insert" on public.products
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "products_update" on public.products
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "products_delete" on public.products
  for delete to authenticated using (public.is_org_member(org_id));

-- product_variants
create policy "variants_select" on public.product_variants
  for select to authenticated using (public.is_org_member(org_id));
create policy "variants_insert" on public.product_variants
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "variants_update" on public.product_variants
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "variants_delete" on public.product_variants
  for delete to authenticated using (public.is_org_member(org_id));

-- inventory
create policy "inventory_select" on public.inventory
  for select to authenticated using (public.is_org_member(org_id));
create policy "inventory_insert" on public.inventory
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "inventory_update" on public.inventory
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "inventory_delete" on public.inventory
  for delete to authenticated using (public.is_org_member(org_id));

-- stock_movements (audit — cho insert/select, không sửa/xoá)
create policy "movements_select" on public.stock_movements
  for select to authenticated using (public.is_org_member(org_id));
create policy "movements_insert" on public.stock_movements
  for insert to authenticated with check (public.is_org_member(org_id));
