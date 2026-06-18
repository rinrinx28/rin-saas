-- 0032 — Thống kê khuyến mãi (MKM): report_promotions.
-- Chỉ ĐỌC, không đổi luồng bán. Dựa trên orders.promotion_id + promo_discount
-- đã ghi sẵn ở create_sale (ADR 0013).

-- Mỗi chương trình KM đã phát sinh trong kỳ: số lượt áp, tổng tiền đã giảm,
-- doanh thu các đơn có áp. (Đơn có promotion_id null — KM bị xoá — không tính.)
create or replace function public.report_promotions(
  p_org uuid, p_from timestamptz, p_to timestamptz, p_limit integer
)
returns table (name text, code text, uses bigint, discount bigint, revenue bigint)
language sql security definer stable set search_path = public as $$
  select p.name,
         p.code,
         count(o.id)::bigint            as uses,
         sum(o.promo_discount)::bigint  as discount,
         sum(o.total)::bigint           as revenue
  from public.promotions p
  join public.orders o on o.promotion_id = p.id
  where p.org_id = p_org
    and o.status = 'completed'
    and o.created_at >= p_from and o.created_at < p_to
    and public.is_org_member(p_org)
  group by p.id, p.name, p.code
  order by 3 desc, 4 desc
  limit p_limit;
$$;

grant execute on function public.report_promotions(uuid, timestamptz, timestamptz, integer)
  to authenticated;
