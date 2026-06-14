-- 0017 — Đối soát chuyển khoản tự động. ADR 0010.
-- payment_integrations (cấu hình webhook per org/store) + bank_transactions
-- (sổ kiểm toán) + RPC reconcile_transfer (atomic, idempotent, chỉ service_role).

create table public.payment_integrations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  store_id        uuid references public.stores (id) on delete cascade,
  provider        text not null default 'sepay',
  webhook_token   text not null unique,
  webhook_secret  text not null,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);
create index payment_integrations_org_idx on public.payment_integrations (org_id);

create table public.bank_transactions (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  integration_id   uuid references public.payment_integrations (id) on delete set null,
  provider         text not null,
  external_id      text not null,
  amount           integer not null default 0,
  account          text,
  content          text,
  status           text not null default 'pending'
                     check (status in ('pending', 'matched', 'unmatched', 'duplicate')),
  matched_order_id uuid references public.orders (id) on delete set null,
  applied_amount   integer not null default 0,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  unique (org_id, provider, external_id)
);
create index bank_transactions_org_idx on public.bank_transactions (org_id, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.payment_integrations enable row level security;
alter table public.bank_transactions    enable row level security;

-- Cấu hình tích hợp (chứa secret) chỉ quản lý xem/sửa.
create policy "payment_integrations_manage" on public.payment_integrations
  for all to authenticated
  using (public.my_role(org_id) in ('owner', 'admin'))
  with check (public.my_role(org_id) in ('owner', 'admin'));

-- Sổ giao dịch: thành viên xem được (ghi qua RPC service_role).
create policy "bank_transactions_select" on public.bank_transactions
  for select to authenticated using (public.is_org_member(org_id));

-- ── RPC: đối soát một giao dịch (atomic, idempotent) ──────────
-- Gọi từ webhook (service_role). p_code_norm = mã đơn đã chuẩn hoá (UPPER, chỉ A-Z0-9).
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

  -- Ghi sổ idempotent theo (org, provider, external_id).
  insert into public.bank_transactions
    (org_id, integration_id, provider, external_id, amount, account, content, status, raw)
    values (v_org, p_integration, v_provider, p_external_id, coalesce(p_amount, 0),
            p_account, p_content, 'pending', p_raw)
    on conflict (org_id, provider, external_id) do nothing
    returning id into v_txn;
  if v_txn is null then return jsonb_build_object('status', 'duplicate'); end if;

  -- Tìm đơn theo mã chuẩn hoá, trong org (và đúng chi nhánh nếu tích hợp cấp store).
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
    -- Đơn đã đủ tiền: không áp, đánh dấu để rà tay.
    update public.bank_transactions
      set status = 'unmatched', matched_order_id = v_order where id = v_txn;
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

grant execute on function public.reconcile_transfer(uuid, text, integer, text, text, text, jsonb)
  to service_role;
