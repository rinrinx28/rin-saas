-- 0030 — Khuyến mãi mức đơn: promotions + helper promo_discount
-- + create_sale áp khuyến mãi (drop bản 6 tham số, tạo bản 7 tham số có p_code). ADR 0013.

create table public.promotions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  name          text not null,
  code          text,                       -- null = tự áp; có mã = coupon
  type          text not null check (type in ('percent', 'amount')),
  value         integer not null check (value > 0),
  min_order     integer not null default 0 check (min_order >= 0),
  max_discount  integer check (max_discount is null or max_discount >= 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index promotions_org_id_idx on public.promotions (org_id);
create unique index promotions_org_code_idx
  on public.promotions (org_id, lower(code)) where code is not null;

-- Cột khuyến mãi trên đơn
alter table public.orders
  add column promotion_id  uuid references public.promotions (id) on delete set null,
  add column promo_discount integer not null default 0;

-- ── RLS (thành viên CRUD như categories/products; UI gate theo role) ──
alter table public.promotions enable row level security;
create policy "promotions_select" on public.promotions
  for select to authenticated using (public.is_org_member(org_id));
create policy "promotions_insert" on public.promotions
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "promotions_update" on public.promotions
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "promotions_delete" on public.promotions
  for delete to authenticated using (public.is_org_member(org_id));

-- ── Helper: chọn khuyến mãi giảm nhiều nhất đang hiệu lực ──────
-- Trả jsonb { discount, promotion_id }. KM công khai (code null) tự áp;
-- KM theo mã chỉ tính khi p_code khớp.
create or replace function public.promo_discount(
  p_org      uuid,
  p_subtotal integer,
  p_code     text
)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with valid as (
    select id,
      case when type = 'percent'
           then least((p_subtotal::bigint * value / 100), coalesce(max_discount, p_subtotal))::int
           else least(value, p_subtotal) end as disc
    from public.promotions
    where org_id = p_org and active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and p_subtotal >= min_order
      and (code is null or (p_code is not null and lower(code) = lower(p_code)))
  )
  select coalesce(
    (select jsonb_build_object('discount', disc, 'promotion_id', id)
       from valid where disc > 0 order by disc desc, id limit 1),
    jsonb_build_object('discount', 0, 'promotion_id', null));
$$;

grant execute on function public.promo_discount(uuid, integer, text) to authenticated;

-- ── create_sale: áp khuyến mãi (drop bản cũ → tạo bản có p_code) ──
drop function if exists public.create_sale(uuid, uuid, integer, jsonb, text, integer);

create or replace function public.create_sale(
  p_store     uuid,
  p_customer  uuid,
  p_discount  integer,
  p_items     jsonb,
  p_method    text,
  p_paid      integer,
  p_code      text default null
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
  v_promo    jsonb;
  v_promo_d  integer;
  v_promo_id uuid;
  v_discount integer;
  v_total    integer;
  v_paid     integer;
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

  -- Khuyến mãi tự động / theo mã, cộng với chiết khấu tay, kẹp trong [0, subtotal]
  v_promo    := public.promo_discount(v_org, v_subtotal, p_code);
  v_promo_d  := (v_promo->>'discount')::int;
  v_promo_id := nullif(v_promo->>'promotion_id', '')::uuid;
  v_discount := least(greatest(coalesce(p_discount, 0) + v_promo_d, 0), v_subtotal);
  v_total    := v_subtotal - v_discount;
  v_paid     := least(greatest(coalesce(p_paid, 0), 0), v_total);

  if v_paid < v_total and p_customer is null then
    raise exception 'Phải chọn khách hàng để ghi nợ';
  end if;

  insert into public.orders
    (org_id, store_id, customer_id, code, status, subtotal, discount, total, paid,
     promotion_id, promo_discount, created_by)
    values (v_org, p_store, p_customer, 'HD' || to_char(now(), 'YYMMDD-HH24MISS'),
            'completed', v_subtotal, v_discount, v_total, v_paid,
            v_promo_id, v_promo_d, v_uid)
    returning id into v_order;
  v_code := (select code from public.orders where id = v_order);

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

  if v_paid > 0 then
    insert into public.payments (org_id, order_id, method, amount)
      values (v_org, v_order, coalesce(p_method, 'cash'), v_paid);
  end if;

  if p_customer is not null and v_paid < v_total then
    update public.customers set debt = debt + (v_total - v_paid)
      where id = p_customer and org_id = v_org;
  end if;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total, 'discount', v_discount);
end;
$$;

grant execute on function public.create_sale(uuid, uuid, integer, jsonb, text, integer, text) to authenticated;
