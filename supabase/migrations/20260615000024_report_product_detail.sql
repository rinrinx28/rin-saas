-- 0024 — Báo cáo: thêm lãi gộp vào top sản phẩm + so sánh bán ra / nhập vào.

-- top_products: bổ sung profit (đổi kiểu trả về → drop trước).
drop function if exists public.top_products(uuid, timestamptz, timestamptz, integer);
create or replace function public.top_products(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, qty bigint, revenue bigint, profit bigint)
language sql security definer stable set search_path = public as $$
  select (pr.name || ' — ' || pv.name) as name,
         sum(oi.qty)::bigint,
         sum(oi.total)::bigint,
         (sum(oi.total) - sum(oi.qty * pv.cost))::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.product_variants pv on pv.id = oi.variant_id
  join public.products pr on pr.id = pv.product_id
  where o.org_id = p_org and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to
    and public.is_org_member(p_org)
  group by 1
  order by 3 desc
  limit p_limit;
$$;

-- So sánh số lượng bán ra vs nhập vào theo sản phẩm trong kỳ.
create or replace function public.product_sales_vs_purchases(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, sold bigint, purchased bigint)
language sql security definer stable set search_path = public as $$
  with sold as (
    select oi.variant_id vid, sum(oi.qty) q
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.org_id = p_org and o.status = 'completed'
      and o.created_at >= p_from and o.created_at < p_to
    group by 1
  ),
  bought as (
    select pi.variant_id vid, sum(pi.qty) q
    from public.purchase_items pi
    join public.purchase_orders po on po.id = pi.purchase_order_id
    where po.org_id = p_org and po.created_at >= p_from and po.created_at < p_to
    group by 1
  ),
  combined as (
    select coalesce(s.vid, b.vid) vid, coalesce(s.q, 0) sold, coalesce(b.q, 0) bought
    from sold s full join bought b on b.vid = s.vid
  )
  select (pr.name || ' — ' || pv.name) as name, c.sold::bigint, c.bought::bigint
  from combined c
  join public.product_variants pv on pv.id = c.vid
  join public.products pr on pr.id = pv.product_id
  where public.is_org_member(p_org)
  order by (c.sold + c.bought) desc
  limit p_limit;
$$;

grant execute on function public.top_products(uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.product_sales_vs_purchases(uuid, timestamptz, timestamptz, integer) to authenticated;
