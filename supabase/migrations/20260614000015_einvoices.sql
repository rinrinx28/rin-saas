-- 0015 — Hóa đơn điện tử (HĐĐT). ADR 0008.
-- Lưu kết quả phát hành từ provider (stub / Viettel / MISA / VNPT).
-- + RPC issue_einvoice (atomic, idempotent, RBAC owner/admin).

create table public.einvoices (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations (id) on delete cascade,
  order_id            uuid not null references public.orders (id) on delete cascade,
  provider            text not null,
  status              text not null check (status in ('pending', 'issued', 'failed', 'cancelled')),
  series              text,                 -- ký hiệu hóa đơn
  invoice_no          text,                 -- số hóa đơn
  tax_authority_code  text,                 -- mã của cơ quan thuế (CQT)
  lookup_url          text,                 -- link tra cứu
  pdf_url             text,
  error               text,
  payload             jsonb,                -- dữ liệu thô từ provider
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  issued_at           timestamptz
);
create index einvoices_org_id_idx on public.einvoices (org_id);
create index einvoices_order_idx on public.einvoices (order_id);

-- Tối đa 1 HĐĐT đang hiệu lực (issued) cho mỗi đơn.
create unique index einvoices_one_issued_per_order
  on public.einvoices (order_id)
  where status = 'issued';

-- ── RLS ───────────────────────────────────────────────────────
alter table public.einvoices enable row level security;

create policy "einvoices_select" on public.einvoices
  for select to authenticated using (public.is_org_member(org_id));
-- Ghi đi qua RPC issue_einvoice (security definer).

-- ── RPC: phát hành HĐĐT (ghi nhận kết quả provider, idempotent) ─
-- Trả về bản ghi (jsonb). Nếu đơn đã có HĐĐT 'issued' → trả về bản cũ.
create or replace function public.issue_einvoice(
  p_order     uuid,
  p_provider  text,
  p_status    text,
  p_series    text,
  p_no        text,
  p_cqt       text,
  p_lookup    text,
  p_pdf       text,
  p_error     text,
  p_payload   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_row     public.einvoices;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;

  select org_id into v_org from public.orders where id = p_order;
  if v_org is null then raise exception 'Đơn hàng không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if public.my_role(v_org) not in ('owner', 'admin') then
    raise exception 'Chỉ quản lý được phát hành HĐĐT';
  end if;
  if p_status not in ('issued', 'failed') then
    raise exception 'Trạng thái không hợp lệ';
  end if;

  -- Idempotent: đã phát hành thành công thì trả về bản cũ.
  select * into v_row from public.einvoices
    where order_id = p_order and status = 'issued' limit 1;
  if found then
    return to_jsonb(v_row);
  end if;

  insert into public.einvoices
    (org_id, order_id, provider, status, series, invoice_no,
     tax_authority_code, lookup_url, pdf_url, error, payload,
     created_by, issued_at)
    values (v_org, p_order, p_provider, p_status, p_series, p_no,
            p_cqt, p_lookup, p_pdf, p_error, p_payload,
            v_uid, case when p_status = 'issued' then now() else null end)
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.issue_einvoice(
  uuid, text, text, text, text, text, text, text, text, jsonb
) to authenticated;
