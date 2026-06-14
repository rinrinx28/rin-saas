# BUILD: SaaS Quản lý Bán hàng / Kho / Hóa đơn (POS SaaS, multi-tenant)

Bạn là senior engineer. Hãy build MVP của một SaaS multi-tenant quản lý bán hàng,
tồn kho và hóa đơn cho SMB (cùng nhóm tính năng KiotViet / Sapo / Nhanh.vn).
Ưu tiên nền tảng multi-tenant chắc chắn trước, rồi mới tới core POS.

> Lưu ý phạm vi: đây là sản phẩm cùng nhóm tính năng, KHÔNG copy code/brand/giao
> diện độc quyền của bất kỳ sản phẩm nào.

## Tech stack (bắt buộc)
- Next.js 15, App Router, TypeScript `strict`, Server Actions.
- Supabase: Postgres, Auth, Row Level Security (RLS), Storage, Realtime.
- Tailwind CSS + shadcn/ui.
- Supabase CLI cho migrations — mọi thay đổi schema là file SQL versioned trong
  `supabase/migrations`. KHÔNG sửa schema bằng tay trên dashboard.
- Zod + React Hook Form cho validation form.

## Nguyên tắc kiến trúc (không được vi phạm)
1. **Multi-tenant = shared DB + RLS.** Mọi bảng nghiệp vụ có `org_id uuid not null`.
   Bảng cấp chi nhánh thêm `store_id uuid`.
2. **RLS bật từ migration đầu tiên** cho mọi bảng. Không bảng nào để public.
   Policy: user chỉ đọc/ghi row thuộc các `org_id` mà họ là thành viên
   (qua bảng `memberships`).
3. Mọi truy vấn dữ liệu chạy ở server (Server Components / Server Actions).
   `service_role` key không bao giờ xuống client; client chỉ dùng anon key + RLS.
4. Tiền tệ lưu bằng integer (đồng, không dùng float). Số lượng tồn kho cũng integer.
5. Timezone Asia/Ho_Chi_Minh; lưu UTC, format ở UI.

## Data model — MVP
Viết migration tạo các bảng sau (kèm RLS):

- `organizations` (id, name, created_at)
- `memberships` (user_id, org_id, role: owner|admin|staff)
- `stores` (id, org_id, name, address)  -- chi nhánh
- `categories` (id, org_id, name, parent_id)
- `products` (id, org_id, name, sku, category_id, image_url, is_active)
- `product_variants` (id, org_id, product_id, name, barcode, price, cost)
  -- biến thể size/màu; `price`/`cost` là integer đồng
- `inventory` (id, org_id, store_id, variant_id, qty) -- tồn theo từng chi nhánh
- `stock_movements` (id, org_id, store_id, variant_id, type: in|out|adjust,
  qty, ref_type, ref_id, note, created_at) -- audit trail mọi biến động kho
- `customers` (id, org_id, name, phone, debt) ; `suppliers` (id, org_id, name, phone, debt)
- `orders` (id, org_id, store_id, customer_id, code, status, subtotal,
  discount, total, paid, created_by, created_at)
- `order_items` (id, org_id, order_id, variant_id, qty, price, total)
- `payments` (id, org_id, order_id, method: cash|transfer, amount, created_at)
- `purchase_orders` + `purchase_items` (nhập hàng từ supplier — Phase 2)

Yêu cầu: trigger/function cập nhật `inventory.qty` và ghi `stock_movements` mỗi khi
tạo order (xuất kho) hoặc purchase (nhập kho), chạy atomic trong transaction.

## Lộ trình — làm theo từng phase, dừng cho review sau mỗi phase

**Phase 1 — Foundation (làm trước tiên, rồi DỪNG báo cáo):**
- Khởi tạo project: `create-next-app` + `supabase init`.
- Auth (email + password), trang đăng ký/đăng nhập.
- Onboarding: user mới tạo `organization` đầu tiên + `membership` owner + 1 `store`.
- Migration cho `organizations`, `memberships`, `stores` + RLS đầy đủ.
- Viết test cô lập tenant: tạo 2 org, đảm bảo org A không đọc được data org B.
- Layout app + sidebar + chuyển đổi org/chi nhánh.

**Phase 2 — Core POS:**
- CRUD sản phẩm + biến thể + danh mục + upload ảnh (Storage).
- Quản lý tồn kho theo chi nhánh + nhập hàng (purchase) cơ bản.
- Màn hình bán hàng (POS): tìm SP theo tên/barcode, giỏ hàng, chiết khấu,
  thanh toán, tạo order → tự trừ kho + ghi movement. Dùng Realtime đồng bộ tồn.
- Hóa đơn: tạo từ order, trang in (layout A4 + bill 80mm).
- Khách hàng + công nợ cơ bản.

**Phase 3 — Vận hành & báo cáo:** đa chi nhánh đầy đủ, công nợ KH/NCC,
kiểm kho, báo cáo doanh thu/tồn/lãi-lỗ, phân quyền theo role.

**Phase 4 — Lớp SaaS:** subscription/gói cước, onboarding, giới hạn theo gói
(số SP, số user, số chi nhánh), trang billing.

## VN-specific — đánh dấu TODO, CHƯA làm ở MVP (chỉ chừa chỗ tích hợp)
- Thanh toán gói cước: VNPay/MoMo + **SePay/Casso** để đối soát chuyển khoản tự động
  (Stripe không dùng được ở VN).
- Hóa đơn điện tử (HĐĐT) hợp pháp: tích hợp provider Viettel / MISA / VNPT.
- In bill máy in nhiệt K57/K80: qua ESC-POS / print agent local, không in trực tiếp
  từ browser được — chốt phương án ở Phase 2 khi làm trang in.

## Cách làm việc
- Mỗi phase: lập checklist → code → tự test (đặc biệt test RLS cô lập tenant)
  → tóm tắt ngắn gọn → **DỪNG chờ review** trước khi sang phase sau.
- Commit nhỏ, message rõ ràng theo conventional commits.
- Mọi schema change qua migration file; chạy `supabase db reset` để verify.
- Seed sẵn 1 org demo + vài sản phẩm để test nhanh.

## Bắt đầu ngay
Thực hiện **Phase 1**. Khi xong, dừng lại và báo cáo những gì đã làm + cách chạy thử,
rồi chờ mình duyệt.
