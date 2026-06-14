-- 0010 — Kiểm kho: RPC adjust_stock đặt tồn về số thực đếm + ghi movement 'adjust'. Phase 3.
-- p_items: jsonb [{ "variant_id": uuid, "counted": int }]

create or replace function public.adjust_stock(p_store uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_org     uuid;
  it        jsonb;
  v_variant uuid;
  v_counted integer;
  v_have    integer;
  v_delta   integer;
  v_changed integer := 0;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id into v_org from public.stores where id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_variant := (it->>'variant_id')::uuid;
    v_counted := (it->>'counted')::int;
    if v_counted < 0 then continue; end if;

    select qty into v_have from public.inventory
      where store_id = p_store and variant_id = v_variant for update;
    v_have := coalesce(v_have, 0);
    v_delta := v_counted - v_have;
    if v_delta = 0 then continue; end if;

    insert into public.inventory (org_id, store_id, variant_id, qty)
      values (v_org, p_store, v_variant, v_counted)
      on conflict (store_id, variant_id) do update set qty = excluded.qty;

    insert into public.stock_movements
      (org_id, store_id, variant_id, type, qty, ref_type, note, created_by)
      values (v_org, p_store, v_variant, 'adjust', v_delta, 'stocktake', 'Kiểm kho', v_uid);

    v_changed := v_changed + 1;
  end loop;

  return v_changed;
end;
$$;

grant execute on function public.adjust_stock(uuid, jsonb) to authenticated;
