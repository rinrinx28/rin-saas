-- 0025 — Báo cáo Tồn kho & Lãi/lỗ chuyên sâu (ADR 0005 — Phase 3).
-- Tận dụng dashboard hiện có làm trang Doanh thu; bổ sung 2 trang con.

-- ── Tồn kho ────────────────────────────────────────────────────

-- Tổng quan định giá tồn (gộp toàn org, cộng qty mọi chi nhánh theo từng variant).
create or replace function public.report_inventory_summary(p_org uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_org_member(p_org) then raise exception 'Không có quyền'; end if;

  with agg as (
    select i.variant_id,
           sum(i.qty)        as qty,
           max(pv.cost)      as cost,
           max(pv.price)     as price
    from public.inventory i
    join public.product_variants pv on pv.id = i.variant_id
    where i.org_id = p_org
    group by i.variant_id
  )
  select jsonb_build_object(
    'sku_count',     count(*),
    'out_of_stock',  count(*) filter (where qty <= 0),
    'total_qty',     coalesce(sum(qty), 0),
    'cost_value',    coalesce(sum(qty * cost), 0),
    'retail_value',  coalesce(sum(qty * price), 0)
  )
  into v
  from agg;

  return v;
end;
$$;

-- Định giá tồn theo danh mục.
create or replace function public.report_inventory_by_category(p_org uuid)
returns table (name text, qty bigint, cost_value bigint, retail_value bigint)
language sql security definer stable set search_path = public as $$
  select coalesce(c.name, 'Chưa phân loại') as name,
         sum(i.qty)::bigint,
         sum(i.qty * pv.cost)::bigint,
         sum(i.qty * pv.price)::bigint
  from public.inventory i
  join public.product_variants pv on pv.id = i.variant_id
  join public.products pr on pr.id = pv.product_id
  left join public.categories c on c.id = pr.category_id
  where i.org_id = p_org and public.is_org_member(p_org)
  group by 1
  order by 3 desc;
$$;

-- Hàng sắp hết / hết hàng (theo từng chi nhánh, qty <= ngưỡng).
create or replace function public.report_low_stock(
  p_org uuid, p_threshold integer, p_limit integer
)
returns table (name text, store text, qty integer, price integer)
language sql security definer stable set search_path = public as $$
  select (pr.name || ' — ' || pv.name) as name,
         st.name as store,
         i.qty,
         pv.price
  from public.inventory i
  join public.product_variants pv on pv.id = i.variant_id
  join public.products pr on pr.id = pv.product_id
  join public.stores st on st.id = i.store_id
  where i.org_id = p_org and i.qty <= p_threshold
    and public.is_org_member(p_org)
  order by i.qty asc, name asc
  limit p_limit;
$$;

-- Hàng tồn đọng: còn tồn nhưng không bán được trong p_days ngày qua (hoặc chưa từng bán).
create or replace function public.report_dead_stock(
  p_org uuid, p_days integer, p_limit integer
)
returns table (name text, qty bigint, cost_value bigint, last_sold date)
language sql security definer stable set search_path = public as $$
  with stock as (
    select i.variant_id vid, sum(i.qty) qty
    from public.inventory i
    where i.org_id = p_org
    group by 1
    having sum(i.qty) > 0
  ),
  last_sale as (
    select oi.variant_id vid, max(o.created_at)::date d
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.org_id = p_org and o.status = 'completed'
    group by 1
  )
  select (pr.name || ' — ' || pv.name) as name,
         s.qty::bigint,
         (s.qty * pv.cost)::bigint,
         ls.d
  from stock s
  join public.product_variants pv on pv.id = s.vid
  join public.products pr on pr.id = pv.product_id
  left join last_sale ls on ls.vid = s.vid
  where public.is_org_member(p_org)
    and (ls.d is null or ls.d < current_date - p_days)
  order by ls.d asc nulls first, 3 desc
  limit p_limit;
$$;

-- ── Lãi/lỗ ─────────────────────────────────────────────────────

-- Lãi gộp theo danh mục trong kỳ.
create or replace function public.report_profit_by_category(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, revenue bigint, cogs bigint, profit bigint)
language sql security definer stable set search_path = public as $$
  select coalesce(c.name, 'Chưa phân loại') as name,
         sum(oi.total)::bigint,
         sum(oi.qty * pv.cost)::bigint,
         (sum(oi.total) - sum(oi.qty * pv.cost))::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.product_variants pv on pv.id = oi.variant_id
  join public.products pr on pr.id = pv.product_id
  left join public.categories c on c.id = pr.category_id
  where o.org_id = p_org and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to
    and public.is_org_member(p_org)
  group by 1
  order by 4 desc;
$$;

grant execute on function public.report_inventory_summary(uuid) to authenticated;
grant execute on function public.report_inventory_by_category(uuid) to authenticated;
grant execute on function public.report_low_stock(uuid, integer, integer) to authenticated;
grant execute on function public.report_dead_stock(uuid, integer, integer) to authenticated;
grant execute on function public.report_profit_by_category(uuid, timestamptz, timestamptz, integer) to authenticated;
