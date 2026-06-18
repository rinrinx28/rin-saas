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

### 3. Resolve org context: rewrite ở middleware (không dời thư mục)

Thay vì vật lý dời ~25 route folder (làm vỡ hàng loạt import `@/app/(app)/...`),
dùng **middleware** (`lib/supabase/middleware.ts`) làm hai việc:

1. **`/s/[orgId]/rest` → ghi `active_org=orgId` (từ URL) + `rewrite` nội bộ về
   `/rest`.** Route `(app)`/`(pos)`/`(print)` cũ phục vụ nguyên vẹn; URL trên trình
   duyệt vẫn là `/s/[orgId]/...`. Page/action hiện có gọi `getActiveOrgId()` (cookie)
   → trả đúng org của URL, **không phải sửa**.
2. **URL trần thuộc workspace (vd `/products`) → `redirect` lên `/s/[active_org]/products`**
   bằng cookie. Nhờ vậy mọi link/redirect nội bộ cũ tự được "nâng" về URL có org —
   **không phải prefix từng link** (chỉ prefix nav chính + switcher để tránh nhảy thêm 1 nhịp).

**Đa-tab đúng cả khi mutate:** Server Action trong App Router POST về **đúng URL trang**
(`/s/[orgId]/...`), nên middleware set `active_org` từ URL *của tab đó* ngay trong request
→ action đọc đúng org. Cookie tuy toàn cục nhưng mỗi request tự suy lại org từ URL.

Guard: `(app)/layout` nếu `active_org` (=org trong URL) không thuộc user → về `/app`.

### 4. orgId trong URL = UUID (slug để sau)

Dùng thẳng UUID của org làm path segment cho nhanh & không trùng. Thêm cột `slug`
thân thiện (`/s/cua-hang-abc/...`) là cải tiến sau — cần backfill + ràng buộc duy nhất.

## Lộ trình (phân pha để không vỡ app)

- **Pha A — Hub (additive):** dựng `/app` + 4 mục; chuyển điểm-tới đăng nhập sang
  `/app`. Workspace tạm vẫn chạy cookie như cũ (nút "Vào" set cookie → `/dashboard`).
  Không phá route hiện có.
- **Pha B — URL-scope (rewrite):** middleware rewrite `/s/[orgId]` + tự nâng URL trần
  (mục 3); sidebar/switcher/nút "Vào" điều hướng theo `/s/[orgId]/...` (hook `useOrgPath`);
  guard layout. Không dời thư mục, không đổi import.

## Hệ quả

- Mỗi trang workspace vẫn phải đủ loading/empty/error (ADR 0004).
- `getActiveStoreId` (chi nhánh) tạm giữ cookie; cân nhắc đưa vào URL ở pass sau.
- Cảnh báo Next 16: nên đổi `middleware.ts` → `proxy.ts` (follow-up, không chặn).
- Link nội bộ chưa prefix vẫn chạy (được middleware nâng URL) — chỉ tốn 1 redirect;
  prefix dần để mượt hơn.
