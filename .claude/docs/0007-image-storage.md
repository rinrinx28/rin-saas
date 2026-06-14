# 0007 — Lưu trữ ảnh (Image storage)

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0005](0005-feature-route-map.md) (Phase 2 — upload ảnh)

## Bối cảnh

Sản phẩm cần ảnh. Cân nhắc giữa **Supabase Storage** và **Cloudflare R2**.

## Quyết định

Dùng **Supabase Storage** cho MVP.

- Chung hệ auth/RLS + SDK với phần còn lại → ship nhanh, ít hạ tầng.
- Bucket `product-images` (public read; write giới hạn theo org qua RLS trên
  `storage.objects`).
- Đường dẫn object: `{org_id}/{uuid}-{filename}` → policy kiểm tra
  `is_org_member((storage.foldername(name))[1]::uuid)` cho ghi.
- DB chỉ lưu `products.image_url` (URL public).

## Abstraction để đổi nhà cung cấp sau

- Mọi upload đi qua một lớp helper (vd `lib/storage`) trả về `image_url`.
- DB chỉ phụ thuộc `image_url` (string), KHÔNG phụ thuộc Supabase.
- Khi egress/chi phí thành vấn đề ở quy mô lớn → đổi sang **Cloudflare R2**
  (miễn phí egress) bằng cách thay lớp helper, schema giữ nguyên.

## Phương án đã cân nhắc & loại

- **Cloudflare R2 ngay từ đầu:** rẻ egress ở quy mô lớn nhưng phải tự dựng S3
  presign + CDN/worker, chậm ship, tách khỏi RLS → để dành cho giai đoạn tối ưu.
