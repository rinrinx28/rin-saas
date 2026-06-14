-- 0009 — Công nợ nhà cung cấp: phiếu nhập có "đã trả", ghi nợ NCC khi trả thiếu,
-- RPC trả nợ NCC. Phase 3.

alter table public.purchase_orders add column paid integer not null default 0;

-- Thay receive_purchase: thêm p_paid, ghi nợ NCC phần còn thiếu
drop function if exists public.receive_purchase(uuid, uuid, text, jsonb);

create or replace function public.receive_purchase(
  p_store     uuid,
  p_supplier  uuid,
  p_note      text,
  p_items     jsonb,
  p_paid      integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_po      uuid;
  v_total   integer := 0;
  v_paid    integer;
  it        jsonb;
  v_variant uuid;
  v_qty     integer;
  v_cost    integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id into v_org from public.stores where id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Phiếu nhập rỗng'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (it->>'qty')::int * (it->>'cost')::int;
  end loop;

  v_paid := least(greatest(coalesce(p_paid, 0), 0), v_total);
  if v_paid < v_total and p_supplier is null then
    raise exception 'Phải chọn nhà cung cấp để ghi nợ';
  end if;

  insert into public.purchase_orders (org_id, store_id, supplier_id, note, total, paid, created_by)
    values (v_org, p_store, p_supplier, p_note, v_total, v_paid, v_uid)
    returning id into v_po;

  for it in select * from jsonb_array_elements(p_items) loop
    v_variant := (it->>'variant_id')::uuid;
    v_qty     := (it->>'qty')::int;
    v_cost    := (it->>'cost')::int;

    insert into public.purchase_items (org_id, purchase_order_id, variant_id, qty, cost, total)
      values (v_org, v_po, v_variant, v_qty, v_cost, v_qty * v_cost);

    insert into public.inventory (org_id, store_id, variant_id, qty)
      values (v_org, p_store, v_variant, v_qty)
      on conflict (store_id, variant_id)
      do update set qty = public.inventory.qty + excluded.qty;

    insert into public.stock_movements
      (org_id, store_id, variant_id, type, qty, ref_type, ref_id, note, created_by)
      values (v_org, p_store, v_variant, 'in', v_qty, 'purchase', v_po, p_note, v_uid);
  end loop;

  -- Ghi nợ phải trả NCC
  if p_supplier is not null and v_paid < v_total then
    update public.suppliers set debt = debt + (v_total - v_paid)
      where id = p_supplier and org_id = v_org;
  end if;

  return v_po;
end;
$$;

grant execute on function public.receive_purchase(uuid, uuid, text, jsonb, integer) to authenticated;

-- Trả nợ NCC (giảm debt, không âm)
create or replace function public.pay_supplier_debt(p_supplier uuid, p_amount integer)
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
  select org_id into v_org from public.suppliers where id = p_supplier;
  if v_org is null then raise exception 'Nhà cung cấp không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;

  update public.suppliers set debt = greatest(debt - p_amount, 0)
    where id = p_supplier returning debt into v_new;
  return v_new;
end;
$$;

grant execute on function public.pay_supplier_debt(uuid, integer) to authenticated;
