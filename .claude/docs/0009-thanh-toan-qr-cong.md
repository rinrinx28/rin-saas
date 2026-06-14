# 0009 — Thanh toán: cấu hình tài khoản, QR chuyển khoản & cổng VNPay/MoMo

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14

## Vấn đề

POS cần nhận thanh toán **chuyển khoản** cho đơn của khách: hiển thị QR
VietQR theo số tiền + nội dung CK để khách quét. Trước đây thông tin ngân
hàng nằm trong env (`NEXT_PUBLIC_BANK_*`) và chỉ phục vụ thanh toán gói
cước. Cần đưa cấu hình vào DB theo **cửa hàng (org)** và cho phép **chi
nhánh (store)** ghi đè. Đồng thời chuẩn bị chỗ cắm **VNPay/MoMo**.

## Quyết định

1. **Cấu hình tài khoản nhận tiền** lưu ở DB:
   - `organizations`: `bank_name, bank_account, bank_holder` — mặc định cấp cửa hàng.
   - `stores`: `bank_name, bank_account, bank_holder` — ghi đè theo chi nhánh.
   - **Bank hiệu lực** = nếu chi nhánh có `bank_account` → dùng của chi nhánh
     (cả 3 trường), ngược lại dùng của org. (all-or-nothing, helper
     `effectiveBank`).
   - Chỉ **quản lý (owner/admin)** được sửa (kiểm `isManager` ở action).

2. **QR thuần, KHÔNG logo** — sinh qua `qr.sepay.vn/img` với
   `template=qronly` (không khung/không logo ngân hàng). Áp dụng cho cả QR
   gói cước (đổi từ `compact` → `qronly`). Nội dung CK dạng ASCII không dấu
   (`TT <mã đơn>`).

3. **QR hiển thị ở:** POS lúc chọn "Chuyển khoản" (số tiền = tổng đơn),
   trang chi tiết đơn `/orders/[id]`, và bill in (A4/80mm).

4. **VNPay/MoMo = adapter stub** (giống cách làm HĐĐT 0008): interface
   `PaymentGateway` ở `lib/payment/gateways`, provider stub trả về trạng
   thái `stub` + ghi chú "cần cấu hình merchant". `payments.method` mở rộng
   nhận `vnpay`, `momo`. Tích hợp redirect/IPN thật để phase sau (cần
   credentials merchant nên chưa test live).

## Hệ quả

- Không cần merchant để dùng QR chuyển khoản — chạy với mọi ngân hàng.
- Đối soát chuyển khoản tại quầy là **thủ công** (thu ngân thấy tiền về rồi
  bấm "Thu tiền"); không có webhook cho đơn bán lẻ ở bản này.
- Đổi nhà cung cấp QR/cổng = thêm provider, không đụng UI.

## Chưa làm

- Tích hợp cổng VNPay/MoMo thật (redirect + IPN xác nhận tự động).
- Webhook đối soát tự động cho đơn bán lẻ (như SePay đang làm cho gói cước).
