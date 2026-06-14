# 0010 — Đối soát chuyển khoản tự động (auto-reconciliation)

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14

## Vấn đề

Hiện thanh toán chuyển khoản cho đơn của khách (POS) đối soát **thủ công**:
thu ngân nhìn thấy tiền về rồi bấm "Thu tiền". Cần **đối soát tự động**: khi
khách chuyển khoản đúng nội dung, hệ thống tự ghi nhận thanh toán cho đơn,
đồng thời lưu **sổ kiểm toán** mọi giao dịch (khớp / chưa khớp) để cửa hàng
rà soát.

Mỗi cửa hàng tự kết nối tài khoản ngân hàng của họ với bên thứ ba
(SePay…); bên đó bắn webhook khi có tiền về.

## Quyết định

1. **Cấu hình theo cửa hàng (org) + ghi đè chi nhánh (store)** — đồng bộ
   với cấu hình tài khoản nhận tiền (ADR 0009). Bảng `payment_integrations`:
   `org_id`, `store_id` (null = cấp cửa hàng), `provider`, `webhook_token`
   (ngẫu nhiên, định danh tenant trên URL), `webhook_secret` (xác thực),
   `enabled`. Mỗi tích hợp cho ra **1 URL webhook + 1 secret** để dán vào
   SePay.

2. **Webhook URL riêng từng tenant:** `/api/webhooks/bank/<provider>/<token>`.
   `token` định danh tích hợp; verify `webhook_secret` (header Apikey).
   Không tin số tiền/tài khoản trong payload ngoài việc khớp đơn.

3. **Adapter provider** `lib/payment/reconcile` — chuẩn hoá payload từng
   provider thành `NormalizedTxn`. **SePay trước**, cắm Casso/khác sau.

4. **Sổ kiểm toán** `bank_transactions`: lưu mọi giao dịch nhận được
   (`external_id` duy nhất theo org+provider → idempotent), trạng thái
   `matched` / `unmatched` / `duplicate`, `matched_order_id`,
   `applied_amount`, `raw`.

5. **Đối soát atomic qua RPC `reconcile_transfer`** (security definer, chỉ
   `service_role` gọi — từ webhook): insert giao dịch idempotent → tìm đơn
   theo **mã đơn** trích từ nội dung CK (so khớp sau khi bỏ ký tự đặc biệt,
   vì bank hay xoá dấu `-`) trong đúng org → nếu khớp & đơn còn thiếu tiền:
   tăng `order.paid` (clamp theo phần còn thiếu), ghi `payment` method
   `transfer`, giảm `customers.debt` tương ứng. Dư tiền → chỉ áp phần còn
   thiếu, phần thừa ghi nhận nhưng không áp (đánh dấu để rà tay).

6. **Realtime:** đơn tự chuyển "đã thanh toán" khi tiền về (postgres_changes,
   nhớ `setAuth` token cho bảng RLS — bài học ADR/realtime trước).

## Bảo mật

- `webhook_secret` riêng từng tenant; verify trước khi xử lý. RLS cô lập
  `bank_transactions` / `payment_integrations` theo org.
- Idempotency theo `(org_id, provider, external_id)`.
- RPC chỉ cấp cho `service_role`; người dùng thường không gọi được.
- Ghi/đổi cấu hình chỉ **quản lý (owner/admin)**.

## Hệ quả & lưu ý

- Cần **URL public** để provider gọi tới → test local phải mở tunnel
  (cloudflared/ngrok) rồi khai báo trên dashboard SePay.
- Quy tắc tiền: chỉ đóng đơn khi đủ phần còn thiếu; trả thiếu → vẫn pending,
  trả dư → áp phần còn thiếu, phần dư để rà.

## Chưa làm

- Casso/provider khác (đã có khung adapter).
- Cảnh báo/nhắc khi có giao dịch chưa khớp; gộp nhiều lần chuyển cho một đơn
  (hiện mỗi lần áp cộng dồn vào `paid`, đã hỗ trợ trả góp cùng đơn).
