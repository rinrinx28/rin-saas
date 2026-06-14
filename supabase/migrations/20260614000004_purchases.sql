-- 0004 — Nhập hàng: suppliers, purchase_orders, purchase_items
-- + RPC receive_purchase (atomic: cộng tồn + ghi stock_movements). ADR 0005 — Phase 2.

create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  phone       text,
  debt        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index suppliers_org_id_idx on public.suppliers (org_id);

create table public.purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  store_id     uuid not null references public.stores (id) on delete cascade,
  supplier_id  uuid references public.suppliers (id) on delete set null,
  note         text,
  total        integer not null default 0,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index purchase_orders_org_id_idx on public.purchase_orders (org_id);
create index purchase_orders_store_id_idx on public.purchase_orders (store_id);

create table public.purchase_items (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id  uuid not null references public.purchase_orders (id) on delete cascade,
  variant_id         uuid not null references public.product_variants (id) on delete restrict,
  qty                integer not null check (qty > 0),
  cost               integer not null default 0 check (cost >= 0),
  total              integer not null default 0
);
create index purchase_items_po_idx on public.purchase_items (purchase_order_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.suppliers        enable row level security;
alter table public.purchase_orders  enable row level security;
alter table public.purchase_items   enable row level security;

create policy "suppliers_select" on public.suppliers
  for select to authenticated using (public.is_org_member(org_id));
create policy "suppliers_insert" on public.suppliers
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "suppliers_update" on public.suppliers
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "suppliers_delete" on public.suppliers
  for delete to authenticated using (public.is_org_member(org_id));

create policy "purchase_orders_select" on public.purchase_orders
  for select to authenticated using (public.is_org_member(org_id));
create policy "purchase_items_select" on public.purchase_items
  for select to authenticated using (public.is_org_member(org_id));
-- Tạo purchase đi qua RPC receive_purchase (không insert trực tiếp).

-- ── RPC: nhập kho (atomic) ────────────────────────────────────
-- p_items: jsonb [{ "variant_id": uuid, "qty": int, "cost": int }]
create or replace function public.receive_purchase(
  p_store     uuid,
  p_supplier  uuid,
  p_note      text,
  p_items     jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_po      uuid;
  v_total   integer := 0;
  it        jsonb;
  v_variant uuid;
  v_qty     integer;
  v_cost    integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;

  select org_id into v_org from public.stores where id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Phiếu nhập rỗng';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (it->>'qty')::int * (it->>'cost')::int;
  end loop;

  insert into public.purchase_orders (org_id, store_id, supplier_id, note, total, created_by)
    values (v_org, p_store, p_supplier, p_note, v_total, v_uid)
    returning id into v_po;

  for it in select * from jsonb_array_elements(p_items) loop
    v_variant := (it->>'variant_id')::uuid;
    v_qty     := (it->>'qty')::int;
    v_cost    := (it->>'cost')::int;

    insert into public.purchase_items (org_id, purchase_order_id, variant_id, qty, cost, total)
      values (v_org, v_po, v_variant, v_qty, v_cost, v_qty * v_cost);

    insert into public.inventory (org_id, store_id, variant_id, qty)
      values (v_org, p_store, v_variant, v_qty)
      on conflict (store_id, variant_id)
      do update set qty = public.inventory.qty + excluded.qty;

    insert into public.stock_movements
      (org_id, store_id, variant_id, type, qty, ref_type, ref_id, note, created_by)
      values (v_org, p_store, v_variant, 'in', v_qty, 'purchase', v_po, p_note, v_uid);
  end loop;

  return v_po;
end;
$$;

grant execute on function public.receive_purchase(uuid, uuid, text, jsonb) to authenticated;
