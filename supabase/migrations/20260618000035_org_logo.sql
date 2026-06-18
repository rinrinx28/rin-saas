-- 0035 — Avatar/logo cửa hàng (organization).
-- Tái dùng bucket 'product-images' (ADR 0007): path {org_id}/logo-{uuid}.ext đã được
-- policy ghi-theo-thành-viên-org bao phủ. Chỉ cần thêm cột lưu URL public.

alter table public.organizations add column logo_url text;
