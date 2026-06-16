-- 0027 — Loại hóa đơn + thuế suất cho HĐĐT (NĐ 123/2020, TT 78/2021).
-- 'sales' = Hóa đơn bán hàng (mẫu số 2, không tách thuế);
-- 'gtgt'  = Hóa đơn GTGT (mẫu số 1, tách thuế theo tax_rate).

alter table public.einvoice_config
  add column if not exists invoice_type text not null default 'sales'
    check (invoice_type in ('sales', 'gtgt')),
  add column if not exists tax_rate smallint not null default 10
    check (tax_rate >= 0 and tax_rate <= 20);
