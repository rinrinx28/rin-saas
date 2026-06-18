-- 0028 — Ca bán hàng (shifts) + Định nghĩa ca (shift_definitions) + Sổ quỹ (cash_ledger). ADR 0012.
-- Tiền = integer (đồng). Mutation qua RPC security definer + is_org_member.
-- Ca cố định theo settings: định nghĩa ở cấp cửa hàng (store_id null) hoặc chi nhánh (ghi đè).
-- Tiền đầu ca theo 3 chế độ (organizations.shift_opening_mode): cuốn chiếu / định mức / nhập tay.

-- ── Cấu hình ca cấp tổ chức ───────────────────────────────────
alter table public.organizations
  add column shift_opening_mode text not null default 'manual'
    check (shift_opening_mode in ('carry', 'fixed', 'manual')),
  add column shift_fixed_float integer not null default 0 check (shift_fixed_float >= 0);

-- ── Định nghĩa ca (mẫu ca) ────────────────────────────────────
-- store_id null = mặc định cửa hàng (áp mọi chi nhánh).
-- store_id = X  = bộ riêng của chi nhánh → ghi đè bộ mặc định cho chi nhánh đó.
create table public.shift_definitions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  store_id    uuid references public.stores (id) on delete cascade,
  name        text not null,
  start_time  time,
  end_time    time,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index shift_definitions_org_idx on public.shift_definitions (org_id);
create index shift_definitions_store_idx on public.shift_definitions (store_id);

-- ── Ca bán hàng (phiên) ───────────────────────────────────────
create table public.shifts (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations (id) on delete cascade,
  store_id              uuid not null references public.stores (id) on delete cascade,
  definition_id         uuid references public.shift_definitions (id) on delete set null,
  shift_name            text,                       -- snapshot tên ca lúc mở (báo cáo ổn định)
  opened_by             uuid references auth.users (id) on delete set null,
  opened_at             timestamptz not null default now(),
  opening_cash          integer not null default 0 check (opening_cash >= 0),
  opening_mode          text,                       -- chế độ tiền đầu ca đã dùng
  closed_by             uuid references auth.users (id) on delete set null,
  closed_at             timestamptz,
  closing_cash_counted  integer,
  closing_breakdown     jsonb,                      -- đếm theo mệnh giá {"500000":3,...}
  expected_cash         integer,
  diff                  integer,
  status                text not null default 'open' check (status in ('open', 'closed')),
  note                  text,
  created_at            timestamptz not null default now()
);
create index shifts_org_id_idx on public.shifts (org_id);
create index shifts_store_id_idx on public.shifts (store_id);
-- Mỗi chi nhánh chỉ một ca mở tại một thời điểm.
create unique index shifts_one_open_per_store_idx
  on public.shifts (store_id) where status = 'open';

create table public.cash_ledger (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  store_id    uuid not null references public.stores (id) on delete cascade,
  shift_id    uuid references public.shifts (id) on delete set null,
  direction   text not null check (direction in ('in', 'out')),
  category    text not null default 'khac',
  amount      integer not null check (amount > 0),
  ref_type    text,
  ref_id      uuid,
  note        text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index cash_ledger_org_id_idx on public.cash_ledger (org_id);
create index cash_ledger_store_id_idx on public.cash_ledger (store_id);
create index cash_ledger_shift_id_idx on public.cash_ledger (shift_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.shifts            enable row level security;
alter table public.cash_ledger       enable row level security;
alter table public.shift_definitions enable row level security;

create policy "shifts_select" on public.shifts
  for select to authenticated using (public.is_org_member(org_id));
create policy "cash_ledger_select" on public.cash_ledger
  for select to authenticated using (public.is_org_member(org_id));

-- Định nghĩa ca: thành viên CRUD (UI gate theo role quản lý)
create policy "shift_def_select" on public.shift_definitions
  for select to authenticated using (public.is_org_member(org_id));
create policy "shift_def_insert" on public.shift_definitions
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "shift_def_update" on public.shift_definitions
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "shift_def_delete" on public.shift_definitions
  for delete to authenticated using (public.is_org_member(org_id));

-- ── Helper: ca mở của một chi nhánh ───────────────────────────
create or replace function public.current_shift(p_store uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.shifts where store_id = p_store and status = 'open' limit 1;
$$;

-- ── Helper: bộ ca hiệu lực của chi nhánh (chi nhánh ghi đè cửa hàng) ──
create or replace function public.effective_shift_definitions(p_store uuid)
returns setof public.shift_definitions
language sql
security definer
stable
set search_path = public
as $$
  with org as (select org_id from public.stores where id = p_store)
  select d.* from public.shift_definitions d, org
  where d.org_id = org.org_id and d.active and public.is_org_member(d.org_id)
    and (
      case when exists (
        select 1 from public.shift_definitions s
        where s.store_id = p_store and s.active
      )
      then d.store_id = p_store           -- chi nhánh có bộ riêng → chỉ lấy bộ riêng
      else d.store_id is null             -- ngược lại → kế thừa bộ mặc định cửa hàng
      end
    )
  order by d.sort_order, d.name;
$$;

-- ── RPC: mở ca (mode-aware) ───────────────────────────────────
create or replace function public.open_shift(
  p_store        uuid,
  p_definition   uuid,
  p_opening_cash integer default null,
  p_note         text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_mode    text;
  v_fixed   integer;
  v_opening integer;
  v_name    text;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select s.org_id, o.shift_opening_mode, o.shift_fixed_float
    into v_org, v_mode, v_fixed
    from public.stores s join public.organizations o on o.id = s.org_id
    where s.id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if public.current_shift(p_store) is not null then
    raise exception 'Chi nhánh đang có ca mở';
  end if;

  -- Định nghĩa ca (tuỳ chọn): phải nằm trong bộ hiệu lực của chi nhánh
  if p_definition is not null then
    select name into v_name from public.effective_shift_definitions(p_store) where id = p_definition;
    if v_name is null then raise exception 'Ca không hợp lệ cho chi nhánh'; end if;
  end if;

  -- Tiền đầu ca theo chế độ
  v_opening := case v_mode
    when 'manual' then greatest(coalesce(p_opening_cash, 0), 0)
    when 'fixed'  then coalesce(v_fixed, 0)
    else coalesce(                                   -- 'carry': đếm cuối ca trước
      (select closing_cash_counted from public.shifts
        where store_id = p_store and status = 'closed'
        order by closed_at desc nulls last limit 1), 0)
  end;

  insert into public.shifts
    (org_id, store_id, definition_id, shift_name, opened_by, opening_cash, opening_mode, note)
    values (v_org, p_store, p_definition, v_name, v_uid, v_opening, v_mode, nullif(p_note, ''))
    returning id into v_id;
  return v_id;
end;
$$;

-- ── RPC: phiếu thu/chi tiền mặt (tự gắn ca mở nếu có) ──────────
create or replace function public.record_cash(
  p_store     uuid,
  p_direction text,
  p_category  text,
  p_amount    integer,
  p_note      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_direction not in ('in', 'out') then raise exception 'Loại phiếu không hợp lệ'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Số tiền không hợp lệ'; end if;
  select org_id into v_org from public.stores where id = p_store;
  if v_org is null then raise exception 'Chi nhánh không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;

  insert into public.cash_ledger
    (org_id, store_id, shift_id, direction, category, amount, note, created_by)
    values (v_org, p_store, public.current_shift(p_store), p_direction,
            coalesce(nullif(p_category, ''), 'khac'), p_amount, nullif(p_note, ''), v_uid)
    returning id into v_id;
  return v_id;
end;
$$;

-- ── Helper: tổng hợp tiền của một ca (dùng chung cho chốt ca & UI) ──
-- expected = đầu ca + tiền mặt bán trong ca + thu − chi (sổ quỹ gắn ca).
create or replace function public.shift_summary(p_shift uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_org       uuid;
  v_store     uuid;
  v_opened_at timestamptz;
  v_closed_at timestamptz;
  v_opening   integer;
  v_upper     timestamptz;
  v_sales     integer;
  v_in        integer;
  v_out       integer;
begin
  select org_id, store_id, opened_at, closed_at, opening_cash
    into v_org, v_store, v_opened_at, v_closed_at, v_opening
    from public.shifts where id = p_shift;
  if v_org is null then raise exception 'Ca không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;

  v_upper := coalesce(v_closed_at, now());
  select coalesce(sum(p.amount), 0) into v_sales
    from public.payments p
    join public.orders o on o.id = p.order_id
    where o.store_id = v_store and p.method = 'cash'
      and p.created_at >= v_opened_at and p.created_at <= v_upper;

  select coalesce(sum(amount) filter (where direction = 'in'), 0),
         coalesce(sum(amount) filter (where direction = 'out'), 0)
    into v_in, v_out
    from public.cash_ledger where shift_id = p_shift;

  return jsonb_build_object(
    'opening', v_opening, 'sales_cash', v_sales, 'cash_in', v_in, 'cash_out', v_out,
    'expected', v_opening + v_sales + v_in - v_out);
end;
$$;

-- ── RPC: chốt ca (đối chiếu; nhận tổng đếm hoặc bảng mệnh giá) ─
create or replace function public.close_shift(
  p_shift     uuid,
  p_counted   integer,
  p_note      text default null,
  p_breakdown jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_org       uuid;
  v_status    text;
  v_opened_by uuid;
  v_sum       jsonb;
  v_expected  integer;
  v_counted   integer;
  v_diff      integer;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select org_id, status, opened_by into v_org, v_status, v_opened_by
    from public.shifts where id = p_shift;
  if v_org is null then raise exception 'Ca không tồn tại'; end if;
  if not public.is_org_member(v_org) then raise exception 'Không có quyền'; end if;
  if v_status <> 'open' then raise exception 'Ca đã chốt'; end if;
  if v_opened_by <> v_uid
     and public.my_role(v_org) not in ('owner', 'admin', 'store_manager') then
    raise exception 'Không có quyền chốt ca';
  end if;

  -- Có bảng mệnh giá → tổng đếm = Σ mệnh_giá × số_tờ (server tự cộng).
  if p_breakdown is not null and p_breakdown <> '{}'::jsonb then
    select coalesce(sum((key)::bigint * (value)::int), 0)::int into v_counted
      from jsonb_each_text(p_breakdown);
  else
    v_counted := greatest(coalesce(p_counted, 0), 0);
  end if;

  v_sum      := public.shift_summary(p_shift);
  v_expected := (v_sum->>'expected')::int;
  v_diff     := v_counted - v_expected;

  update public.shifts set
    closed_by = v_uid, closed_at = now(),
    closing_cash_counted = v_counted, closing_breakdown = p_breakdown,
    expected_cash = v_expected, diff = v_diff,
    status = 'closed', note = coalesce(nullif(p_note, ''), note)
    where id = p_shift;

  return v_sum || jsonb_build_object('counted', v_counted, 'diff', v_diff);
end;
$$;

grant execute on function public.current_shift(uuid) to authenticated;
grant execute on function public.effective_shift_definitions(uuid) to authenticated;
grant execute on function public.shift_summary(uuid) to authenticated;
grant execute on function public.open_shift(uuid, uuid, integer, text) to authenticated;
grant execute on function public.record_cash(uuid, text, text, integer, text) to authenticated;
grant execute on function public.close_shift(uuid, integer, text, jsonb) to authenticated;
