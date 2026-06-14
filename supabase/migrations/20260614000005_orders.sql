-- 0005 — Bán hàng: customers, orders, order_items, payments
-- + RPC create_sale (atomic: trừ kho + ghi movement) + realtime inventory. Phase 2.

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  phone       text,
  debt        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index customers_org_id_idx on public.customers (org_id);

create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  store_id     uuid not null references public.stores (id) on delete cascade,
  customer_id  uuid references public.customers (id) on delete set null,
  code         text not null,
  status       text not null default 'completed' check (status in ('completed', 'cancelled', 'draft')),
  subtotal     integer not null default 0,
  discount     integer not null default 0,
  total        integer not null default 0,
  paid         integer not null default 0,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index orders_org_id_idx on public.orders (org_id);
create index orders_store_id_idx on public.orders (store_id);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  order_id    uuid not null references public.orders (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete restrict,
  qty         integer not null check (qty > 0),
  price       integer not null default 0,
  total       integer not null default 0
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  order_id    uuid not null references public.orders (id) on delete cascade,
  method      text not null default 'cash' check (method in ('cash', 'transfer')),
  amount      integer not null default 0,
  created_at  timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.customers   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;

create policy "customers_select" on public.customers
  for select to authenticated using (public.is_org_member(org_id));
create policy "customers_insert" on public.customers
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "customers_update" on public.customers
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "customers_delete" on public.customers
  for delete to authenticated using (public.is_org_member(org_id));

create policy "orders_select" on public.orders
  for select to authenticated using (public.is_org_member(org_id));
create policy "order_items_select" on public.order_items
  for select to authenticated using (public.is_org_member(org_id));
create policy "payments_select" on public.payments
  for select to authenticated using (public.is_org_member(org_id));
-- Tạo order đi qua RPC create_sale.

-- ── RPC: bán hàng (atomic, kiểm tra tồn) ──────────────────────
-- p_items: jsonb [{ "variant_id": uuid, "qty": int, "price": int }]
create or replace function public.create_sale(
  p_store     uuid,
  p_customer  uuid,
  p_discount  integer,
  p_items     jsonb,
  p_method    text,
  p_paid      integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_org      uuid;
  v_order    uuid;
  v_code     text;
  v_subtotal integer := 0;
  v_total    integer;
  it         jsonb;
  v_variant  uuid;
  v_qty      integer;
  v_price    integer;
  v_have     integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id into v_org from public.stores where id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Giỏ hàng rỗng'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (it->>'qty')::int * (it->>'price')::int;
  end loop;
  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);
  v_code := 'HD' || to_char(now(), 'YYMMDD-HH24MISS');

  insert into public.orders
    (org_id, store_id, customer_id, code, status, subtotal, discount, total, paid, created_by)
    values (v_org, p_store, p_customer, v_code, 'completed', v_subtotal,
            coalesce(p_discount, 0), v_total, coalesce(p_paid, 0), v_uid)
    returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    v_variant := (it->>'variant_id')::uuid;
    v_qty     := (it->>'qty')::int;
    v_price   := (it->>'price')::int;

    select qty into v_have from public.inventory
      where store_id = p_store and variant_id = v_variant for update;
    if v_have is null or v_have < v_qty then
      raise exception 'Không đủ tồn kho cho một sản phẩm';
    end if;

    insert into public.order_items (org_id, order_id, variant_id, qty, price, total)
      values (v_org, v_order, v_variant, v_qty, v_price, v_qty * v_price);

    update public.inventory set qty = qty - v_qty
      where store_id = p_store and variant_id = v_variant;

    insert into public.stock_movements
      (org_id, store_id, variant_id, type, qty, ref_type, ref_id, created_by)
      values (v_org, p_store, v_variant, 'out', v_qty, 'order', v_order, v_uid);
  end loop;

  if coalesce(p_paid, 0) > 0 then
    insert into public.payments (org_id, order_id, method, amount)
      values (v_org, v_order, coalesce(p_method, 'cash'), p_paid);
  end if;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total);
end;
$$;

grant execute on function public.create_sale(uuid, uuid, integer, jsonb, text, integer) to authenticated;

-- ── Realtime: đồng bộ tồn kho ─────────────────────────────────
alter publication supabase_realtime add table public.inventory;
