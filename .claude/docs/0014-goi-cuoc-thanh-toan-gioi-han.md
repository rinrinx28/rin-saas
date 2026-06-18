# 0014 — Lớp SaaS: Gói cước, thanh toán & giới hạn

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-18
- **Liên quan:** [0005](0005-feature-route-map.md) (Phase 4), [0009](0009-thanh-toan-qr-cong.md), [0010](0010-doi-soat-tu-dong.md), [0011](0011-nhan-su-vai-tro-loi-moi.md)

## Vấn đề

Phase 4 cần biến sản phẩm thành **SaaS thực thụ**: có gói cước, thu tiền thuê bao,
và **chặn dùng quá hạn mức** của gói. Ràng buộc thực tế ở VN: chưa tích hợp cổng
thuê bao tự động (Stripe…), nên thu tiền **qua chuyển khoản ngân hàng** và **đối
soát tự động** bằng hạ tầng SePay đã có (ADR 0010). Tránh dựng cổng thanh toán
mới — tái dùng đường đối soát theo nội dung chuyển khoản.

## Quyết định

### 1. Ba gói cước (nguồn chân lý: `lib/plans.ts`)

| Gói | Giá/tháng | Sản phẩm | Chi nhánh | Nhân viên |
|---|---:|---:|---:|---:|
| Miễn phí (`free`) | 0đ | 30 | 1 | 2 |
| Pro (`pro`) | 199.000đ | 1.000 | 5 | 10 |
| Doanh nghiệp (`business`) | 499.000đ | ∞ | ∞ | ∞ |

`null` = không giới hạn. Gói lưu ở `organizations.plan` + `plan_expires_at`
(migration 0012/0013). **Nhân viên đếm cả lời mời pending** (1 lời mời = 1 ghế
đã giữ chỗ).

### 2. Thanh toán qua chuyển khoản + đối soát SePay

- Đổi gói trả phí → tạo `payment_requests` (`org_id, plan, amount, memo,
  status, provider`). **Memo** dạng `RIN` + 7 ký tự (`genMemo`) là khoá đối soát.
- UI hiện **QR SePay** (`qr.sepay.vn`) + nội dung CK chứa memo; khách quét/chuyển.
- Webhook SePay (`/api/webhooks/sepay`) dò memo `RIN…` trong nội dung → gọi
  `confirmPayment(memo, amount)`:
  - `status != pending` (đã `paid`) → **idempotent**, trả ok.
  - `amount < amount` yêu cầu → từ chối (`amount_too_low`).
  - đủ tiền → đánh dấu `paid` + nâng `organizations.plan` + đặt
    `plan_expires_at = now + 30 ngày`.
- `payment_requests` bật **Realtime** (migration 0014): UI nhận `status='paid'`
  tức thì để tự nâng gói; có fallback poll 4s.
- `NEXT_PUBLIC_PAYMENT_SIMULATE=true` (chỉ dev) → nút "đã chuyển khoản (giả lập)"
  chạy đúng `confirmPayment` để test luồng không cần tiền thật.

### 3. Hết hạn = lười (lazy), không cron

Không có job hạ gói. Gói trả phí **quá hạn được coi như `free` ngay khi đọc** qua
hàm thuần `effectivePlan(plan, expiresAt, now)` (`lib/plans.ts`), dùng lại trong
`getOrgPlan` và phản chiếu y hệt bằng SQL trong `org_member_limit()`. Dữ liệu cũ
(quá hạn mức free) **được giữ**, chỉ **chặn tạo mới** cho tới khi gia hạn.

### 4. Enforce giới hạn — hai tầng theo độ rủi ro

- **Sản phẩm / Chi nhánh** — tạo 1 bước (insert thẳng): chặn ở **app-layer**
  `checkLimit()` (`lib/limits.ts`) trước khi insert. Đủ tốt: giới hạn mềm, một
  thao tác.
- **Nhân viên** — luồng **2 bước** (mời → đồng ý) nên app-layer dễ rò (lời mời
  pending không được tính → mời nhiều rồi đồng ý hàng loạt sẽ vượt trần). Vì vậy
  **chốt cứng trong RPC** (migration 0034, `security definer`):
  - `org_member_limit(org)` — trần hiệu lực (đã tính hết hạn). `NULL` = ∞.
  - `invite_member` — chặn khi `memberships + lời mời pending ≥ trần`.
  - `accept_invite` — chặn khi `memberships thật ≥ trần` (hàng rào cuối cùng).
  - App-layer `checkLimit("members")` vẫn giữ (đếm cả pending) để phản hồi sớm.

Số trần trong SQL **lặp lại** `lib/plans.ts` một cách có chủ đích → có **test
drift-guard** (`tests/subscription.test.ts`) đối chiếu `org_member_limit()` với
`PLANS[*].limits.members` để không lệch.

## Hệ quả

- Đã có test thật trên cloud: `confirmPayment` (kích hoạt/idempotent/thiếu tiền/
  memo sai), trần nhân viên (mời/đồng ý/vượt trần/nâng gói ∞), `effectivePlan`.
- **Đánh đổi đã chấp nhận:** đối soát theo memo tin tưởng SePay đã xác thực
  webhook; giới hạn nhân viên ở `accept_invite` là *count-then-insert* nên về lý
  thuyết hai lượt đồng ý đồng thời khi còn đúng 1 ghế có thể cùng lọt — chấp nhận
  với giới hạn mềm (không phải tiền/kho).
- **Còn lại:** nhắc gia hạn trước hạn; hoá đơn/biên nhận cho khoản thuê bao;
  lịch sử thanh toán ở `/settings/billing`.
