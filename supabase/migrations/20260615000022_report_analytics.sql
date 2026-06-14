-- 0022 — Báo cáo nâng cao: doanh thu theo ngày, top nhập, top khách/NCC,
-- cơ cấu phương thức thanh toán. Phục vụ dashboard biểu đồ.

-- Doanh thu / lãi gộp theo từng ngày (đủ ngày trong kỳ, ngày trống = 0).
create or replace function public.report_daily_revenue(
  p_org uuid, p_from timestamptz, p_to timestamptz
)
returns table (day date, revenue bigint, orders bigint, profit bigint)
language sql security definer stable set search_path = public as $$
  with days as (
    select generate_series(
      date_trunc('day', p_from),
      date_trunc('day', p_to - interval '1 microsecond'),
      interval '1 day'
    )::date d
  ),
  rev as (
    select date_trunc('day', created_at)::date d, sum(total) r, count(*) c
    from public.orders
    where org_id = p_org and status = 'completed'
      and created_at >= p_from and created_at < p_to
    group by 1
  ),
  cogs as (
    select date_trunc('day', o.created_at)::date d, sum(oi.qty * pv.cost) cg
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.product_variants pv on pv.id = oi.variant_id
    where o.org_id = p_org and o.status = 'completed'
      and o.created_at >= p_from and o.created_at < p_to
    group by 1
  )
  select d.d,
         coalesce(rev.r, 0)::bigint,
         coalesce(rev.c, 0)::bigint,
         (coalesce(rev.r, 0) - coalesce(cogs.cg, 0))::bigint
  from days d
  left join rev on rev.d = d.d
  left join cogs on cogs.d = d.d
  where public.is_org_member(p_org)
  order by d.d;
$$;

-- Top sản phẩm nhập nhiều (theo số lượng) trong kỳ.
create or replace function public.top_purchased_products(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, qty bigint, value bigint)
language sql security definer stable set search_path = public as $$
  select (pr.name || ' — ' || pv.name) as name,
         sum(pi.qty)::bigint,
         sum(pi.qty * pi.cost)::bigint
  from public.purchase_items pi
  join public.purchase_orders po on po.id = pi.purchase_order_id
  join public.product_variants pv on pv.id = pi.variant_id
  join public.products pr on pr.id = pv.product_id
  where po.org_id = p_org and po.created_at >= p_from and po.created_at < p_to
    and public.is_org_member(p_org)
  group by 1
  order by 2 desc
  limit p_limit;
$$;

-- Top khách hàng theo doanh thu trong kỳ (khách lẻ gộp chung).
create or replace function public.top_customers(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, orders bigint, revenue bigint)
language sql security definer stable set search_path = public as $$
  select coalesce(c.name, 'Khách lẻ') as name,
         count(*)::bigint,
         sum(o.total)::bigint
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  where o.org_id = p_org and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to
    and public.is_org_member(p_org)
  group by 1
  order by 3 desc
  limit p_limit;
$$;

-- Top nhà cung cấp theo giá trị nhập trong kỳ.
create or replace function public.top_suppliers(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, orders bigint, value bigint)
language sql security definer stable set search_path = public as $$
  select coalesce(s.name, 'Không rõ') as name,
         count(*)::bigint,
         sum(po.total)::bigint
  from public.purchase_orders po
  left join public.suppliers s on s.id = po.supplier_id
  where po.org_id = p_org and po.created_at >= p_from and po.created_at < p_to
    and public.is_org_member(p_org)
  group by 1
  order by 3 desc
  limit p_limit;
$$;

-- Cơ cấu phương thức thanh toán trong kỳ.
create or replace function public.payment_method_breakdown(
  p_org uuid, p_from timestamptz, p_to timestamptz
)
returns table (method text, count bigint, amount bigint)
language sql security definer stable set search_path = public as $$
  select p.method, count(*)::bigint, sum(p.amount)::bigint
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.org_id = p_org and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to
    and public.is_org_member(p_org)
  group by p.method
  order by 3 desc;
$$;

grant execute on function public.report_daily_revenue(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.top_purchased_products(uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.top_customers(uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.top_suppliers(uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.payment_method_breakdown(uuid, timestamptz, timestamptz) to authenticated;
