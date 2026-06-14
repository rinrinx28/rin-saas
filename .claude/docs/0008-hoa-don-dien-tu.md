# 0008 — Hóa đơn điện tử (HĐĐT)

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Bối cảnh:** Phase VN-specific (sau khi xong Phase 1–4 + thanh toán SePay).

## Vấn đề

Doanh nghiệp VN bắt buộc phát hành **hóa đơn điện tử** (HĐĐT) có mã của
cơ quan thuế (CQT) cho giao dịch bán hàng. Ta cần phát hành HĐĐT cho một
đơn đã hoàn tất, lưu lại **số hóa đơn / ký hiệu / mã CQT / link tra cứu**
để khách tra cứu và để đối chiếu khi cần.

Thực tế mỗi nhà cung cấp (Viettel S-Invoice, MISA meInvoice, VNPT) có API
khác nhau và cần hợp đồng/chứng thư số. Ta **chưa** chốt nhà cung cấp, nên
không khóa cứng vào một API.

## Quyết định

1. **Adapter pattern** — định nghĩa interface `EInvoiceProvider` ở
   `lib/einvoice`. Mặc định dùng provider **`stub`** (sinh số/ký hiệu/mã
   CQT + link tra cứu giả) để chạy được end-to-end. Cắm Viettel/MISA/VNPT
   sau bằng cách thêm provider mới, chọn qua env `EINVOICE_PROVIDER`.

2. **Lưu trữ** — bảng `einvoices` (1 đơn ↔ nhiều bản ghi lịch sử, nhưng
   **tối đa 1 bản ghi `issued` đang hiệu lực / đơn**, đảm bảo bằng unique
   index một phần). Cột chính: `provider, status, series (ký hiệu),
   invoice_no (số HĐ), tax_authority_code (mã CQT), lookup_url, pdf_url,
   error, payload (jsonb thô từ provider)`.

3. **Trạng thái:** `pending` → `issued` | `failed`. Có thể `cancelled`
   (hủy/điều chỉnh) ở phase sau — chưa làm.

4. **Phát hành đi qua RPC `issue_einvoice` (security definer, idempotent)**
   — đã phát hành thành công thì gọi lại trả về bản ghi cũ, không tạo
   trùng. RBAC: chỉ **quản lý (owner/admin)** được phát hành; kiểm ở cả
   server action (`isManager`) lẫn RPC (`my_role`).

5. **Không** chặn theo gói cước ở bản này (HĐĐT là nghĩa vụ pháp lý, không
   phải tính năng trả phí). Có thể xem lại sau.

## Hệ quả

- Phát hành HĐĐT chỉ là **ghi nhận kết quả** từ provider; provider thật sẽ
  gọi API CQT. Stub cho phép kiểm thử luồng UI + DB ngay.
- Link tra cứu & mã CQT hiển thị ở `/orders/[id]`; cắm vào bill in sau.
- Đổi nhà cung cấp = thêm file provider, không đụng UI/DB.

## Chưa làm (để phase sau)

- Provider thật (Viettel/MISA/VNPT) + chứng thư số.
- Hủy/điều chỉnh/thay thế HĐĐT (`cancelled`/điều chỉnh theo TT78).
- Gửi HĐĐT cho khách qua email/zalo; nhúng mã tra cứu vào bill in.
