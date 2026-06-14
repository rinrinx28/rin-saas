-- 0006 — Công nợ khách hàng: create_sale cộng nợ khi trả thiếu + thu nợ. Phase 2.

-- Thay create_sale: nếu có khách & trả thiếu (paid < total) → cộng vào customers.debt
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
  v_paid     integer := coalesce(p_paid, 0);
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
  v_code := 'HD' || to_char(now(), 'YYMMDD-HH24MISS');

  if v_paid < v_total and p_customer is null then
    raise exception 'Phải chọn khách hàng để ghi nợ';
  end if;

  insert into public.orders
    (org_id, store_id, customer_id, code, status, subtotal, discount, total, paid, created_by)
    values (v_org, p_store, p_customer, v_code, 'completed', v_subtotal,
            coalesce(p_discount, 0), v_total, v_paid, v_uid)
    returning id into v_order;

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

  -- Ghi nợ phần còn thiếu
  if p_customer is not null and v_paid < v_total then
    update public.customers set debt = debt + (v_total - v_paid)
      where id = p_customer and org_id = v_org;
  end if;

  return jsonb_build_object('id', v_order, 'code', v_code, 'total', v_total);
end;
$$;

-- Thu nợ khách hàng (giảm debt, không âm)
create or replace function public.collect_customer_debt(
  p_customer uuid,
  p_amount   integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_new integer;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  if p_amount <= 0 then raise exception 'Số tiền không hợp lệ'; end if;
  select org_id into v_org from public.customers where id = p_customer;
  if v_org is null then raise exception 'Khách hàng không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;

  update public.customers
    set debt = greatest(debt - p_amount, 0)
    where id = p_customer
    returning debt into v_new;

  return v_new;
end;
$$;

grant execute on function public.collect_customer_debt(uuid, integer) to authenticated;
