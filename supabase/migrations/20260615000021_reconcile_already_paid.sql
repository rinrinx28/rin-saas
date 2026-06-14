-- 0021 — Phân biệt giao dịch khớp đúng đơn nhưng đơn đã đủ tiền (không áp thêm).
-- Trước đây gắn nhãn 'unmatched' gây hiểu nhầm "chưa khớp". ADR 0010.

alter table public.bank_transactions drop constraint if exists bank_transactions_status_check;
alter table public.bank_transactions
  add constraint bank_transactions_status_check
  check (status in ('pending', 'matched', 'unmatched', 'duplicate', 'already_paid'));

-- Cập nhật RPC: nhánh "đơn đã đủ tiền" → status 'already_paid' (vẫn gắn matched_order_id).
create or replace function public.reconcile_transfer(
  p_integration uuid,
  p_external_id text,
  p_amount      integer,
  p_account     text,
  p_content     text,
  p_code_norm   text,
  p_raw         jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid;
  v_store    uuid;
  v_provider text;
  v_txn      uuid;
  v_order    uuid;
  v_total    integer;
  v_paid     integer;
  v_customer uuid;
  v_delta    integer;
begin
  select org_id, store_id, provider into v_org, v_store, v_provider
    from public.payment_integrations where id = p_integration and enabled = true;
  if v_org is null then return jsonb_build_object('status', 'no_integration'); end if;

  insert into public.bank_transactions
    (org_id, integration_id, provider, external_id, amount, account, content, status, raw)
    values (v_org, p_integration, v_provider, p_external_id, coalesce(p_amount, 0),
            p_account, p_content, 'pending', p_raw)
    on conflict (org_id, provider, external_id) do nothing
    returning id into v_txn;
  if v_txn is null then return jsonb_build_object('status', 'duplicate'); end if;

  if p_code_norm is not null and length(p_code_norm) > 0 then
    select id, total, paid, customer_id into v_order, v_total, v_paid, v_customer
      from public.orders
      where org_id = v_org
        and (v_store is null or store_id = v_store)
        and status = 'completed'
        and regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = p_code_norm
      order by created_at desc
      limit 1
      for update;
  end if;

  if v_order is null then
    update public.bank_transactions set status = 'unmatched' where id = v_txn;
    return jsonb_build_object('status', 'unmatched', 'txn', v_txn);
  end if;

  v_delta := least(coalesce(p_amount, 0), greatest(v_total - v_paid, 0));
  if v_delta <= 0 then
    -- Khớp đúng đơn nhưng đơn đã đủ tiền (xác nhận tay / giao dịch trước) → không áp thêm.
    update public.bank_transactions
      set status = 'already_paid', matched_order_id = v_order where id = v_txn;
    return jsonb_build_object('status', 'already_paid', 'order', v_order);
  end if;

  update public.orders set paid = paid + v_delta where id = v_order;
  insert into public.payments (org_id, order_id, method, amount)
    values (v_org, v_order, 'transfer', v_delta);
  if v_customer is not null then
    update public.customers set debt = greatest(debt - v_delta, 0) where id = v_customer;
  end if;
  update public.bank_transactions
    set status = 'matched', matched_order_id = v_order, applied_amount = v_delta
    where id = v_txn;

  return jsonb_build_object('status', 'matched', 'order', v_order, 'applied', v_delta);
end;
$$;
