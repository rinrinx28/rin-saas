-- 0033 — Phân bổ giảm giá (KM + chiết khấu tay) về từng dòng order_items.
-- Mục tiêu: (a) quy MKM về từng sản phẩm; (b) xuất HĐĐT đúng VAT (giá sau giảm
-- theo dòng, NĐ 123/2020); (c) báo cáo lãi gộp chuẩn hơn. ADR 0013.
--
-- ⚠️ CHƯA ÁP DỤNG TỰ ĐỘNG: review + supabase db push + chạy test cloud rồi mới merge.
--
-- Quy ước:
--   • order_items.total = thành tiền GỐC (qty × price) — GIỮ NGUYÊN để không vỡ
--     báo cáo cũ. order_items.discount = phần giảm phân bổ. Net dòng = total − discount.
--   • Phân bổ theo phương pháp "lũy kế làm tròn" → Σ(discount dòng) = giảm giá đơn
--     TUYỆT ĐỐI (không dư/thiếu đồng do làm tròn).
--   • Chỉ phân bổ v_discount (KM + chiết khấu tay). ĐỔI ĐIỂM giữ ở mức đơn
--     (chưa chốt xử lý thuế GTGT của đổi điểm) — sẽ xử lý cùng phần HĐĐT.

alter table public.order_items
  add column if not exists discount integer not null default 0 check (discount >= 0);

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
  -- phân bổ giảm giá về dòng
  v_run_total integer := 0;   -- lũy kế thành tiền gốc đã duyệt
  v_alloc     integer := 0;   -- lũy kế giảm giá đã phân bổ
  v_line_tot  integer;
  v_line_disc integer;
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
    v_line_tot := v_qty * v_price;

    -- Phân bổ giảm giá theo lũy kế làm tròn (Σ khớp v_discount tuyệt đối).
    v_run_total := v_run_total + v_line_tot;
    if v_subtotal > 0 then
      v_line_disc := (v_discount::bigint * v_run_total / v_subtotal)::int - v_alloc;
    else
      v_line_disc := 0;
    end if;
    v_alloc := v_alloc + v_line_disc;

    select qty into v_have from public.inventory
      where store_id = p_store and variant_id = v_variant for update;
    if v_have is null or v_have < v_qty then
      raise exception 'Không đủ tồn kho cho một sản phẩm';
    end if;

    insert into public.order_items (org_id, order_id, variant_id, qty, price, total, discount)
      values (v_org, v_order, v_variant, v_qty, v_price, v_line_tot, v_line_disc);

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
