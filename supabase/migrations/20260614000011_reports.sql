-- 0011 — Báo cáo: tổng hợp doanh thu/giá vốn + top sản phẩm. Phase 3.

-- Tổng hợp trong khoảng [p_from, p_to): doanh thu (total sau CK), số đơn, giá vốn (COGS)
create or replace function public.report_summary(
  p_org  uuid,
  p_from timestamptz,
  p_to   timestamptz
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_revenue bigint;
  v_orders  bigint;
  v_cogs    bigint;
begin
  if not public.is_org_member(p_org) then raise exception 'Không có quyền'; end if;

  select coalesce(sum(total), 0), count(*)
    into v_revenue, v_orders
  from public.orders
  where org_id = p_org and status = 'completed'
    and created_at >= p_from and created_at < p_to;

  select coalesce(sum(oi.qty * pv.cost), 0)
    into v_cogs
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.product_variants pv on pv.id = oi.variant_id
  where o.org_id = p_org and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to;

  return jsonb_build_object('revenue', v_revenue, 'orders', v_orders, 'cogs', v_cogs);
end;
$$;

-- Top sản phẩm theo doanh thu trong khoảng
create or replace function public.top_products(
  p_org   uuid,
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit integer
)
returns table (name text, qty bigint, revenue bigint)
language sql
security definer
stable
set search_path = public
as $$
  select (pr.name || ' — ' || pv.name) as name,
         sum(oi.qty)::bigint as qty,
         sum(oi.total)::bigint as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.product_variants pv on pv.id = oi.variant_id
  join public.products pr on pr.id = pv.product_id
  where o.org_id = p_org and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to
    and public.is_org_member(p_org)
  group by 1
  order by revenue desc
  limit p_limit;
$$;

grant execute on function public.report_summary(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.top_products(uuid, timestamptz, timestamptz, integer) to authenticated;
