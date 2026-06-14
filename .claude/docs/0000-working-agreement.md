# 0000 — Cách làm việc & quy tắc dự án

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14

## Bối cảnh

`rin-saas` là một **SaaS POS multi-tenant** (cùng nhóm tính năng
KiotViet / Sapo / Nhanh.vn) cho SMB: quản lý bán hàng, tồn kho, hóa đơn.
Build spec đầy đủ ở [`design-system.md`](../../design-system.md) (gốc repo) —
tài liệu đó là **spec sản phẩm/kiến trúc**, không phải design system.

## Quyết định — quy trình làm việc

1. **Single source of truth:** mọi quyết định thiết kế/quy ước đã duyệt nằm trong
   `.claude/docs/` dưới dạng ADR đánh số. `README.md` là mục lục.
2. **Quy trình:** đề xuất (kèm lý do + phương án thay thế) → duyệt → ghi ADR
   `Accepted` → mới code. Không tự ý code lệch ADR `Accepted`.
3. **Đổi quyết định:** tạo ADR mới `Supersedes #N`; file cũ chuyển `Superseded`.
4. **Ngôn ngữ tài liệu & trao đổi:** tiếng Việt.

## Ràng buộc kiến trúc kế thừa từ build spec (không vi phạm)

- **Multi-tenant = shared DB + RLS.** Mọi bảng nghiệp vụ có `org_id`; cấp chi
  nhánh thêm `store_id`. RLS bật từ migration đầu tiên.
- **Truy vấn ở server** (Server Components / Server Actions). `service_role` key
  không bao giờ xuống client; client chỉ dùng anon key + RLS.
- **Tiền tệ & số lượng lưu bằng integer** (đồng, không dùng float).
- **Timezone Asia/Ho_Chi_Minh:** lưu UTC, format ở UI.
- **Schema change qua migration versioned** (`supabase/migrations`), verify bằng
  `supabase db reset`. Không sửa schema tay trên dashboard.

## Quy ước kỹ thuật

- Next.js 16 App Router, TypeScript `strict`, Tailwind v4, shadcn/ui.
- Zod + React Hook Form cho validation form.
- Commit nhỏ, conventional commits.
- Làm theo từng **phase**; xong phase → tóm tắt ngắn → **dừng chờ review**.

## Hệ quả

- Mọi tính năng mới phải đối chiếu ADR `Accepted` trước khi code.
- Khi thiếu quyết định cho một mảng (vd. tokens, typography), phải brainstorm +
  duyệt + ghi ADR trước, không "code tạm rồi sửa sau".
