# 0015 — Hub cá nhân & workspace URL-scope theo cửa hàng

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-18
- **Supersedes:** [0005](0005-feature-route-map.md) — **quyết định #1** (tenant context =
  cookie + switcher, đăng nhập vào thẳng dashboard). Các phần khác của 0005 giữ nguyên.
- **Liên quan:** [0011](0011-nhan-su-vai-tro-loi-moi.md), [0014](0014-goi-cuoc-thanh-toan-gioi-han.md)

## Vấn đề

0005 cho user đăng nhập là **vào thẳng** dashboard của cửa hàng active, đổi cửa
hàng bằng switcher trên topbar (bối cảnh ở cookie, URL không mang org). Mô hình này
khó hiểu khi một user thuộc **nhiều cửa hàng**: không có "trang nhà" cấp tài khoản,
không mở song song 2 cửa hàng ở 2 tab, link không nói rõ đang ở cửa hàng nào.

Mục tiêu: vận hành như các SaaS lớn (GitHub org / Vercel team / Shopify) — **một
tài khoản người dùng**, vào **hub cá nhân** trước, từ đó chọn **cửa hàng** để vào
làm việc. Mỗi cửa hàng có **gói cước riêng** (đã đúng: `plan` ở `organizations`,
ADR 0014).

## Quyết định

### 1. Thuật ngữ

"**Cửa hàng**" mà user tham gia = `organizations` (tenant). Mỗi cửa hàng vẫn có
nhiều **chi nhánh** (`stores`) để hỗ trợ chuỗi. Một `auth.users` là thành viên
(`memberships`) của nhiều cửa hàng, mỗi cửa hàng tính tiền độc lập.

### 2. Hai tầng route

```
CÔNG KHAI / TÀI KHOẢN (không gắn cửa hàng)
  /                       landing
  /login /register /forgot-password /reset-password
  /app                    HUB — Cửa hàng đã tham gia (mặc định)
  /app/invites            Lời mời (đồng ý/từ chối)
  /app/account            Quản lý tài khoản (tên, mật khẩu)
  /app/new                Tạo cửa hàng mới (org + chi nhánh đầu)

WORKSPACE CỬA HÀNG (URL mang orgId)
  /s/[orgId]/dashboard
  /s/[orgId]/pos          (fullscreen)
  /s/[orgId]/products … /orders … /settings/* … (toàn bộ (app) cũ)
  /s/[orgId]/print/...    (layout in)
```

- **Đăng nhập / đăng ký / tạo cửa hàng** → điểm tới mặc định là **`/app`** (hub),
  không vào thẳng dashboard nữa.
- Switcher đổi cửa hàng = **điều hướng** sang `/s/[orgId khác]/...` (không còn set
  cookie toàn cục).

### 3. Resolve org context: param + cookie-mirror (giữ tương thích actions)

- **Server Component / layout** đọc `orgId` từ **route param** → đúng theo từng tab.
- `/s/[orgId]/layout.tsx` là **guard**: kiểm tra user là thành viên org (RLS), 404/redirect
  nếu không; nạp org/chi nhánh cho shell.
- **Server Action** không nhận được route param trực tiếp. Để **không phải viết lại
  ~40 action**, **middleware** ghi `orgId` từ URL `/s/[orgId]/...` vào cookie
  `active_org` (mirror) ngay trong request → `getActiveOrgId()` hiện có vẫn trả
  đúng org đang xem.
- **Đánh đổi đã biết:** cookie là toàn cục nên nếu mở 2 tab khác cửa hàng rồi
  *mutate* ở tab cũ mà chưa điều hướng lại, action có thể đọc org của tab kia. Chấp
  nhận cho v1 (đọc/điều hướng đã đúng per-tab); sẽ thread `orgId` vào action ở pass
  sau để chuẩn hoàn toàn.

### 4. orgId trong URL = UUID (slug để sau)

Dùng thẳng UUID của org làm path segment cho nhanh & không trùng. Thêm cột `slug`
thân thiện (`/s/cua-hang-abc/...`) là cải tiến sau — cần backfill + ràng buộc duy nhất.

## Lộ trình (phân pha để không vỡ app)

- **Pha A — Hub (additive):** dựng `/app` + 4 mục; chuyển điểm-tới đăng nhập sang
  `/app`. Workspace tạm vẫn chạy cookie như cũ (nút "Vào" set cookie → `/dashboard`).
  Không phá route hiện có.
- **Pha B — URL-scope:** dời `(app)`/`(pos)`/`(print)` vào `/s/[orgId]/`, thêm guard
  layout + middleware mirror, prefix mọi link nav theo org, đổi nút "Vào" và switcher
  sang điều hướng `/s/[orgId]/...`, cập nhật redirect nội bộ.

## Hệ quả

- Mỗi trang workspace vẫn phải đủ loading/empty/error (ADR 0004).
- `getActiveStoreId` (chi nhánh) tạm giữ cookie; cân nhắc đưa vào URL ở pass sau.
- ADR 0005 §"Điều hướng" cập nhật: sidebar dùng href tương đối theo org (Pha B).
