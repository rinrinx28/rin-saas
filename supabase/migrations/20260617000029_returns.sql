-- 0029 — Đổi/trả hàng: return_orders + return_items + RPC create_return. ADR 0012.
-- Trả theo dòng (một phần đơn), atomic: hoàn tồn + hoàn tiền mặt / giảm công nợ.

create table public.return_orders (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  store_id      uuid not null references public.stores (id) on delete cascade,
  order_id      uuid not null references public.orders (id) on delete cascade,
  code          text not null,
  subtotal      integer not null default 0,   -- tổng tiền hàng trả
  refund_cash   integer not null default 0,   -- hoàn tiền mặt
  debt_reduced  integer not null default 0,   -- trừ vào công nợ KH
  reason        text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index return_orders_org_id_idx on public.return_orders (org_id);
create index return_orders_order_id_idx on public.return_orders (order_id);

create table public.return_items (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  return_order_id  uuid not null references public.return_orders (id) on delete cascade,
  order_item_id    uuid not null references public.order_items (id) on delete restrict,
  variant_id       uuid not null references public.product_variants (id) on delete restrict,
  qty              integer not null check (qty > 0),
  price            integer not null default 0,
  total            integer not null default 0,
  restock          boolean not null default true
);
create index return_items_ro_idx on public.return_items (return_order_id);

-- ── RLS (đọc cho thành viên; ghi qua RPC) ─────────────────────
alter table public.return_orders enable row level security;
alter table public.return_items  enable row level security;

create policy "return_orders_select" on public.return_orders
  for select to authenticated using (public.is_org_member(org_id));
create policy "return_items_select" on public.return_items
  for select to authenticated using (public.is_org_member(org_id));

-- ── RPC: tạo phiếu trả hàng ───────────────────────────────────
-- p_items: jsonb [{ "order_item_id": uuid, "qty": int, "restock": bool }]
create or replace function public.create_return(
  p_order   uuid,
  p_items   jsonb,
  p_reason  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_org        uuid;
  v_store      uuid;
  v_customer   uuid;
  v_status     text;
  v_total      integer;
  v_paid       integer;
  v_return     uuid;
  v_code       text;
  v_refund     integer := 0;
  v_debt_red   integer := 0;
  v_refund_cash integer;
  it           jsonb;
  v_oi         uuid;
  v_qty        integer;
  v_restock    boolean;
  v_variant    uuid;
  v_price      integer;
  v_sold       integer;
  v_returned   integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id, store_id, customer_id, status, total, paid
    into v_org, v_store, v_customer, v_status, v_total, v_paid
    from public.orders where id = p_order;
  if v_org is null then raise exception 'Đơn không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if v_status <> 'completed' then raise exception 'Chỉ trả hàng cho đơn đã hoàn tất'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Chưa chọn dòng hàng trả'; end if;

  v_code := 'TH' || to_char(now(), 'YYMMDD-HH24MISS');
  insert into public.return_orders (org_id, store_id, order_id, code, reason, created_by)
    values (v_org, v_store, p_order, v_code, nullif(p_reason, ''), v_uid)
    returning id into v_return;

  for it in select * from jsonb_array_elements(p_items) loop
    v_oi      := (it->>'order_item_id')::uuid;
    v_qty     := (it->>'qty')::int;
    v_restock := coalesce((it->>'restock')::boolean, true);
    if v_qty is null or v_qty <= 0 then raise exception 'Số lượng trả không hợp lệ'; end if;

    -- Dòng phải thuộc đúng đơn
    select variant_id, price, qty into v_variant, v_price, v_sold
      from public.order_items where id = v_oi and order_id = p_order;
    if v_variant is null then raise exception 'Dòng hàng không thuộc đơn'; end if;

    -- Không trả vượt số còn lại (đã bán − đã trả trước đó)
    select coalesce(sum(ri.qty), 0) into v_returned
      from public.return_items ri
      join public.return_orders ro on ro.id = ri.return_order_id
      where ro.order_id = p_order and ri.order_item_id = v_oi
        and ri.return_order_id <> v_return;
    if v_qty > v_sold - v_returned then
      raise exception 'Trả vượt số lượng đã bán';
    end if;

    insert into public.return_items
      (org_id, return_order_id, order_item_id, variant_id, qty, price, total, restock)
      values (v_org, v_return, v_oi, v_variant, v_qty, v_price, v_qty * v_price, v_restock);
    v_refund := v_refund + v_qty * v_price;

    if v_restock then
      insert into public.inventory (org_id, store_id, variant_id, qty)
        values (v_org, v_store, v_variant, v_qty)
        on conflict (store_id, variant_id)
        do update set qty = public.inventory.qty + excluded.qty;

      insert into public.stock_movements
        (org_id, store_id, variant_id, type, qty, ref_type, ref_id, note, created_by)
        values (v_org, v_store, v_variant, 'in', v_qty, 'return', v_return, p_reason, v_uid);
    end if;
  end loop;

  -- Phân bổ hoàn trả: giảm công nợ phần đơn này còn nợ trước, dư ra hoàn tiền mặt
  if v_customer is not null and v_paid < v_total then
    v_debt_red := least(v_refund, v_total - v_paid);
    update public.customers set debt = greatest(debt - v_debt_red, 0)
      where id = v_customer and org_id = v_org;
  end if;
  v_refund_cash := v_refund - v_debt_red;

  if v_refund_cash > 0 then
    insert into public.cash_ledger
      (org_id, store_id, shift_id, direction, category, amount, ref_type, ref_id, note, created_by)
      values (v_org, v_store, public.current_shift(v_store), 'out', 'hoan_tra',
              v_refund_cash, 'return', v_return, 'Hoàn tiền trả hàng ' || v_code, v_uid);
  end if;

  update public.return_orders
    set subtotal = v_refund, refund_cash = v_refund_cash, debt_reduced = v_debt_red
    where id = v_return;

  return jsonb_build_object('id', v_return, 'code', v_code,
    'subtotal', v_refund, 'refund_cash', v_refund_cash, 'debt_reduced', v_debt_red);
end;
$$;

grant execute on function public.create_return(uuid, jsonb, text) to authenticated;
