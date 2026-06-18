-- 0031 — Tích điểm khách hàng: cấu hình ở organizations, điểm ở customers,
-- loyalty_ledger + create_sale bản cuối (đổi/cộng điểm). ADR 0013.

-- Cấu hình theo tổ chức
alter table public.organizations
  add column loyalty_enabled      boolean not null default false,
  add column loyalty_earn_per_k   integer not null default 0,     -- điểm / 1.000đ chi tiêu
  add column loyalty_redeem_value integer not null default 1000,  -- 1 điểm = ? đồng
  add column loyalty_min_redeem   integer not null default 0;     -- điểm tối thiểu mỗi lần đổi

-- Số dư điểm của khách
alter table public.customers add column points integer not null default 0;

-- Cột điểm trên đơn
alter table public.orders
  add column points_redeemed integer not null default 0,
  add column redeem_value    integer not null default 0,
  add column points_earned   integer not null default 0;

-- Sổ điểm (kiểm toán)
create table public.loyalty_ledger (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete set null,
  delta       integer not null,
  kind        text not null check (kind in ('earn', 'redeem', 'adjust')),
  created_at  timestamptz not null default now()
);
create index loyalty_ledger_customer_idx on public.loyalty_ledger (customer_id);

alter table public.loyalty_ledger enable row level security;
create policy "loyalty_ledger_select" on public.loyalty_ledger
  for select to authenticated using (public.is_org_member(org_id));

-- ── create_sale bản cuối: khuyến mãi + tích/đổi điểm ──────────
drop function if exists public.create_sale(uuid, uuid, integer, jsonb, text, integer, text);

create or replace function public.create_sale(
  p_store         uuid,
  p_customer      uuid,
  p_discount      integer,
  p_items         jsonb,
  p_method        text,
  p_paid          integer,
  p_code          text default null,
  p_redeem_points integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_org       uuid;
  v_order     uuid;
  v_code      text;
  v_subtotal  integer := 0;
  v_promo     jsonb;
  v_promo_d   integer;
  v_promo_id  uuid;
  v_discount  integer;
  v_pre_total integer;
  v_total     integer;
  v_paid      integer;
  -- loyalty
  v_lo_on     boolean := false;
  v_earn_k    integer := 0;
  v_redeem_v  integer := 0;
  v_min_red   integer := 0;
  v_cust_pts  integer := 0;
  v_pts       integer := 0;   -- điểm đổi lần này
  v_redeem    integer := 0;   -- tiền quy đổi từ điểm
  v_earned    integer := 0;   -- điểm cộng thêm
  it          jsonb;
  v_variant   uuid;
  v_qty       integer;
  v_price     integer;
  v_have      integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id into v_org from public.stores where id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Giỏ hàng rỗng'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (it->>'qty')::int * (it->>'price')::int;
  end loop;

  -- Khuyến mãi + chiết khấu tay → giảm giá, kẹp [0, subtotal]
  v_promo     := public.promo_discount(v_org, v_subtotal, p_code);
  v_promo_d   := (v_promo->>'discount')::int;
  v_promo_id  := nullif(v_promo->>'promotion_id', '')::uuid;
  v_discount  := least(greatest(coalesce(p_discount, 0) + v_promo_d, 0), v_subtotal);
  v_pre_total := v_subtotal - v_discount;

  -- Đổi điểm (chỉ khi có khách & bật loyalty)
  if p_customer is not null then
    select loyalty_enabled, loyalty_earn_per_k, loyalty_redeem_value, loyalty_min_redeem
      into v_lo_on, v_earn_k, v_redeem_v, v_min_red
      from public.organizations where id = v_org;
    if v_lo_on then
      select points into v_cust_pts from public.customers where id = p_customer for update;
      if coalesce(p_redeem_points, 0) > 0 and coalesce(v_redeem_v, 0) > 0 then
        v_pts := least(p_redeem_points, coalesce(v_cust_pts, 0), v_pre_total / v_redeem_v);
        if v_pts > 0 and v_pts >= coalesce(v_min_red, 0) then
          v_redeem := v_pts * v_redeem_v;
        else
          v_pts := 0;
        end if;
      end if;
    end if;
  end if;

  v_total := v_pre_total - v_redeem;
  v_paid  := least(greatest(coalesce(p_paid, 0), 0), v_total);

  if v_paid < v_total and p_customer is null then
    raise exception 'Phải chọn khách hàng để ghi nợ';
  end if;

  -- Tích điểm trên tổng sau giảm
  if p_customer is not null and v_lo_on and coalesce(v_earn_k, 0) > 0 then
    v_earned := (v_total / 1000) * v_earn_k;
  end if;

  insert into public.orders
    (org_id, store_id, customer_id, code, status, subtotal, discount, total, paid,
     promotion_id, promo_discount, points_redeemed, redeem_value, points_earned, created_by)
    values (v_org, p_store, p_customer, 'HD' || to_char(now(), 'YYMMDD-HH24MISS'),
            'completed', v_subtotal, v_discount, v_total, v_paid,
            v_promo_id, v_promo_d, v_pts, v_redeem, v_earned, v_uid)
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

  -- Cập nhật điểm KH (đổi − / cộng +) + ghi sổ điểm
  if p_customer is not null and (v_pts > 0 or v_earned > 0) then
    update public.customers
      set points = greatest(points - v_pts, 0) + v_earned
      where id = p_customer and org_id = v_org;
    if v_pts > 0 then
      insert into public.loyalty_ledger (org_id, customer_id, order_id, delta, kind)
        values (v_org, p_customer, v_order, -v_pts, 'redeem');
    end if;
    if v_earned > 0 then
      insert into public.loyalty_ledger (org_id, customer_id, order_id, delta, kind)
        values (v_org, p_customer, v_order, v_earned, 'earn');
    end if;
  end if;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total,
    'discount', v_discount, 'redeem_value', v_redeem, 'points_earned', v_earned);
end;
$$;

grant execute on function public.create_sale(uuid, uuid, integer, jsonb, text, integer, text, integer) to authenticated;
