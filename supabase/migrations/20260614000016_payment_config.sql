-- 0016 — Cấu hình tài khoản nhận tiền (org + ghi đè chi nhánh) + mở rộng
-- phương thức thanh toán (vnpay/momo). ADR 0009.

-- Tài khoản nhận tiền cấp cửa hàng (mặc định).
alter table public.organizations
  add column if not exists bank_name    text,
  add column if not exists bank_account text,
  add column if not exists bank_holder  text;

-- Ghi đè theo chi nhánh (rỗng = kế thừa org).
alter table public.stores
  add column if not exists bank_name    text,
  add column if not exists bank_account text,
  add column if not exists bank_holder  text;

-- Mở rộng phương thức thanh toán: thêm vnpay, momo (adapter stub).
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add constraint payments_method_check
  check (method in ('cash', 'transfer', 'vnpay', 'momo'));
