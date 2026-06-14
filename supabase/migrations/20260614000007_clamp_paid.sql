-- 0007 — Phòng thủ: clamp paid vào [0, total] trong create_sale.
-- Tránh lưu "đã trả" vượt tổng (tiền thừa là tiền thối, không lưu).

create or replace function public.create_sale(
  p_store     uuid,
  p_customer  uuid,
  p_discount  integer,
  p_items     jsonb,
  p_method    text,
  p_paid      integer
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
  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  -- paid trong khoảng [0, total]: trả thừa = tiền thối (không lưu), không lưu paid > total
  v_paid := least(greatest(coalesce(p_paid, 0), 0), v_total);

  if v_paid < v_total and p_customer is null then
    raise exception 'Phải chọn khách hàng để ghi nợ';
  end if;

  insert into public.orders
    (org_id, store_id, customer_id, code, status, subtotal, discount, total, paid, created_by)
    values (v_org, p_store, p_customer, 'HD' || to_char(now(), 'YYMMDD-HH24MISS'),
            'completed', v_subtotal, coalesce(p_discount, 0), v_total, v_paid, v_uid)
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

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total);
end;
$$;
