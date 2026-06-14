-- 0018 — Đơn chờ chuyển khoản (QR mang mã đơn thật) + xác nhận tay + huỷ +
-- realtime cho orders. ADR 0010.

-- Tạo đơn chờ chuyển khoản: paid 0, không bắt buộc khách (chờ tiền về, không phải nợ).
create or replace function public.create_transfer_order(
  p_store    uuid,
  p_customer uuid,
  p_discount integer,
  p_items    jsonb
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

  insert into public.orders
    (org_id, store_id, customer_id, code, status, subtotal, discount, total, paid, created_by)
    values (v_org, p_store, p_customer, 'HD' || to_char(now(), 'YYMMDD-HH24MISS'),
            'completed', v_subtotal, coalesce(p_discount, 0), v_total, 0, v_uid)
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

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total);
end;
$$;

grant execute on function public.create_transfer_order(uuid, uuid, integer, jsonb) to authenticated;

-- Xác nhận tay đã nhận tiền cho đơn (áp phần còn thiếu) — khi chưa bật webhook.
create or replace function public.apply_manual_payment(p_order uuid, p_method text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid;
  v_total    integer;
  v_paid     integer;
  v_customer uuid;
  v_delta    integer;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id, total, paid, customer_id into v_org, v_total, v_paid, v_customer
    from public.orders where id = p_order for update;
  if v_org is null then raise exception 'Đơn không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;

  v_delta := greatest(v_total - v_paid, 0);
  if v_delta <= 0 then return jsonb_build_object('applied', 0); end if;

  update public.orders set paid = paid + v_delta where id = p_order;
  insert into public.payments (org_id, order_id, method, amount)
    values (v_org, p_order, coalesce(p_method, 'transfer'), v_delta);
  if v_customer is not null then
    update public.customers set debt = greatest(debt - v_delta, 0) where id = v_customer;
  end if;
  return jsonb_build_object('applied', v_delta);
end;
$$;

grant execute on function public.apply_manual_payment(uuid, text) to authenticated;

-- Huỷ đơn chưa thanh toán + hoàn tồn kho.
create or replace function public.cancel_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org    uuid;
  v_store  uuid;
  v_status text;
  v_paid   integer;
  v_uid    uuid := auth.uid();
  it       record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id, store_id, status, paid into v_org, v_store, v_status, v_paid
    from public.orders where id = p_order for update;
  if v_org is null then raise exception 'Đơn không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if v_status = 'cancelled' then return; end if;
  if v_paid > 0 then raise exception 'Đơn đã thanh toán, không thể huỷ'; end if;

  for it in select variant_id, qty from public.order_items where order_id = p_order loop
    update public.inventory set qty = qty + it.qty
      where store_id = v_store and variant_id = it.variant_id;
    insert into public.stock_movements
      (org_id, store_id, variant_id, type, qty, ref_type, ref_id, created_by)
      values (v_org, v_store, it.variant_id, 'in', it.qty, 'cancel', p_order, v_uid);
  end loop;

  update public.orders set status = 'cancelled' where id = p_order;
end;
$$;

grant execute on function public.cancel_order(uuid) to authenticated;

-- Realtime: cho phép subscribe đơn (POS chờ tiền về tự cập nhật).
alter publication supabase_realtime add table public.orders;
