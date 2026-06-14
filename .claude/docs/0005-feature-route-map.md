# 0005 — Bản đồ tính năng & route (Information Architecture)

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0000](0000-working-agreement.md), [0004](0004-component-rules.md), [`design-system.md`](../../design-system.md)

## Bối cảnh

Cần chốt **danh sách tính năng** và **cây route (App Router)** cụ thể trước khi
build, để biết build gì / ở đâu / thuộc phase nào. Dựa trên data model + lộ trình
trong build spec.

## Quyết định kiến trúc nền

1. **Tenant context = session + switcher.** Org & chi nhánh đang chọn lưu ở
   cookie/session; đổi bằng switcher trên topbar. URL **không** mang org/store →
   gọn (`/products`, `/pos`). Mọi truy vấn server lọc theo org/store đang active +
   RLS.
2. **POS = trang fullscreen riêng** (`/pos`), không sidebar — tối đa không gian
   bán hàng (kiểu ki-ốt).
3. **Trang in = route riêng, không chrome** (A4 + bill 80mm).

## Cây route (App Router + route groups)

```
app/
├─ layout.tsx                      ✓ root: font + theme (đã xong)
│
├─ (auth)/                         [P1] layout căn giữa, không shell
│  ├─ login/page.tsx
│  ├─ register/page.tsx
│  └─ forgot-password/page.tsx     [P1+]
│
├─ onboarding/page.tsx            [P1] tạo org đầu tiên + store + membership owner
│
├─ (app)/                          [P1] shell: sidebar + topbar + org/store switcher
│  │                                    (guard auth + có org active)
│  ├─ layout.tsx
│  ├─ dashboard/page.tsx          [P1] tổng quan (KPI; làm đầy dần)
│  │
│  ├─ products/                    [P2]
│  │  ├─ page.tsx                  danh sách SP (bảng compact)
│  │  ├─ new/page.tsx              tạo SP + biến thể + ảnh
│  │  └─ [id]/page.tsx             chi tiết/sửa SP
│  ├─ categories/page.tsx         [P2] danh mục (cây cha-con)
│  ├─ inventory/
│  │  ├─ page.tsx                  [P2] tồn theo chi nhánh
│  │  └─ stocktake/page.tsx        [P3] kiểm kho
│  ├─ purchases/                   [P2] nhập hàng từ NCC
│  │  ├─ page.tsx
│  │  └─ new/page.tsx
│  │
│  ├─ orders/
│  │  ├─ page.tsx                  [P2] danh sách đơn
│  │  └─ [id]/page.tsx             [P2] chi tiết đơn + nút in
│  │
│  ├─ customers/
│  │  ├─ page.tsx                  [P2] danh sách
│  │  └─ [id]/page.tsx             [P2→P3] chi tiết + công nợ
│  ├─ suppliers/
│  │  ├─ page.tsx                  [P3]
│  │  └─ [id]/page.tsx             [P3] + công nợ
│  │
│  ├─ reports/
│  │  ├─ page.tsx                  [P3] doanh thu
│  │  ├─ inventory/page.tsx        [P3] tồn kho
│  │  └─ profit/page.tsx           [P3] lãi/lỗ
│  │
│  └─ settings/
│     ├─ page.tsx                  [P1] thông tin org
│     ├─ stores/page.tsx           [P1] chi nhánh
│     ├─ members/page.tsx          [P1 cơ bản → P3 RBAC] nhân viên + role
│     └─ billing/page.tsx          [P4] gói cước
│
├─ (pos)/                          [P2] fullscreen, không sidebar
│  └─ pos/page.tsx                 màn bán hàng: tìm/quét → giỏ → thu tiền
│
└─ (print)/                        [P2] layout in, không chrome
   └─ print/order/[id]/page.tsx    hóa đơn A4 + bill 80mm (toggle khổ)
```

> `/` (gốc): trước mắt là **trang showcase tạm** (tham chiếu design). Khi shell P1
> xong → `/` redirect tới `/dashboard` (đã đăng nhập) hoặc `/login`. Landing
> marketing để [P4].

## Điều hướng (sidebar trong (app))

| Nhóm | Mục | Route |
|---|---|---|
| Tổng quan | Dashboard | `/dashboard` |
| Bán hàng | **Bán hàng (POS)** ↗ mở `/pos` · Đơn hàng | `/pos` · `/orders` |
| Hàng hóa | Sản phẩm · Danh mục · Tồn kho · Nhập hàng | `/products` `/categories` `/inventory` `/purchases` |
| Đối tác | Khách hàng · Nhà cung cấp | `/customers` `/suppliers` |
| Báo cáo | Doanh thu · Tồn kho · Lãi/lỗ | `/reports*` |
| Cài đặt | Cửa hàng · Chi nhánh · Nhân viên · Gói cước | `/settings*` |

Topbar: org switcher + store switcher + tìm kiếm nhanh + theme toggle + menu user.

## Tính năng theo phase (chốt phạm vi)

- **Phase 1 — Foundation:** auth (đăng ký/đăng nhập), onboarding tạo org+store,
  app shell + switcher, migrations `organizations`/`memberships`/`stores` + RLS,
  test cô lập tenant, settings org/stores/members cơ bản.
- **Phase 2 — Core POS:** SP + biến thể + danh mục + upload ảnh; tồn theo chi
  nhánh + nhập hàng; màn POS → order → trừ kho + ghi movement (Realtime); hóa đơn
  + trang in; khách hàng + công nợ cơ bản.
- **Phase 3 — Vận hành & báo cáo:** đa chi nhánh đầy đủ, công nợ KH/NCC, kiểm kho,
  báo cáo doanh thu/tồn/lãi-lỗ, RBAC theo role (owner/admin/staff).
- **Phase 4 — Lớp SaaS:** subscription/gói cước, giới hạn theo gói (số SP/user/chi
  nhánh), trang billing.

## VN-specific — chỉ chừa chỗ tích hợp (CHƯA làm ở MVP)

- Thanh toán gói cước: VNPay/MoMo + SePay/Casso (đối soát CK). Đánh dấu TODO ở
  `/settings/billing`.
- Hóa đơn điện tử (Viettel/MISA/VNPT): chừa chỗ ở trang đơn/in.
- In bill máy nhiệt K57/K80 (ESC-POS / print agent): chốt phương án khi làm
  `(print)` ở P2.

## Hệ quả / việc tiếp theo

- Phase 1 bắt đầu từ: dựng route groups + app shell ((app)/layout) + (auth) +
  onboarding, dùng component nền ADR 0004. Phần Supabase/auth/RLS theo build spec.
- Thay `/` showcase bằng redirect khi shell sẵn sàng.
- Mỗi trang khi build phải có đủ trạng thái loading/empty/error (ADR 0004).
