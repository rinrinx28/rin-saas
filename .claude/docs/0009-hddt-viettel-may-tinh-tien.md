# 0009 — HĐĐT thật: Viettel S-Invoice (hóa đơn khởi tạo từ máy tính tiền)

- **Trạng thái:** Proposed (design doc — chưa code)
- **Ngày:** 2026-06-17
- **Tiền đề:** Nối tiếp [0008 — Hóa đơn điện tử](./0008-hoa-don-dien-tu.md). 0008 đã dựng adapter
  pattern + stub + bảng `einvoices` + RPC `issue_einvoice`. Doc này chốt cách
  **cắm provider thật đầu tiên = Viettel S-Invoice** và các lỗ hổng nghiệp vụ phải lấp.

## 1. Quyết định đã chốt

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Mô hình tích hợp | **Mô hình 1 — BYO** (mỗi shop tự có tài khoản Viettel, nhập credential vào `einvoice_config`) | Ship nhanh, dùng đúng schema 0008 đang có. Reseller (bundle free) để phase sau. |
| Provider đầu tiên | **Viettel S-Invoice** | API REST phổ biến, có sandbox, partner program. (Tránh MISA — đối thủ POS.) |
| Loại hóa đơn cho POS | **HĐĐT khởi tạo từ máy tính tiền** (NĐ 70/2025) | Đúng bản chất bán lẻ B2C tại quầy; **không bắt buộc chữ ký số từng hóa đơn**. |

## 2. Bối cảnh pháp lý — Nghị định 70/2025/NĐ-CP

Sửa đổi NĐ 123/2020. **Hiệu lực 01/6/2025.**

- **Đối tượng bắt buộc:** hộ/cá nhân kinh doanh doanh thu **≥ 1 tỷ đồng/năm** và doanh nghiệp
  bán trực tiếp người tiêu dùng (bán lẻ, ăn uống, lưu trú, vận tải khách, giải trí, làm đẹp…)
  → phải dùng **HĐĐT khởi tạo từ máy tính tiền có kết nối dữ liệu với CQT**.
- **Nội dung bắt buộc (Điều 11):** tên/địa chỉ/MST người bán; tên hàng, đơn giá, số lượng, giá
  thanh toán; **mã CQT hoặc dữ liệu điện tử để người mua tra cứu**; thời điểm lập; thông tin
  người mua nếu yêu cầu.
- **Khác biệt then chốt với HĐĐT thường:** ⭐ **KHÔNG bắt buộc chữ ký số của người bán** trên
  từng hóa đơn (dữ liệu tự đẩy về CQT từ máy tính tiền). → bỏ được toàn bộ phần ký số HSM khỏi
  luồng phát hành.
- **Đăng ký:** **Mẫu 01/ĐKTĐ-HĐĐT** qua Cổng TCT hoặc qua tổ chức cung cấp dịch vụ (Viettel),
  CQT xác nhận trong ~1 ngày làm việc.
- ⚠️ **Lưu ý:** chữ ký số / chứng thư số **vẫn cần để ký tờ khai đăng ký 01/ĐKTĐ** (và các thủ
  tục với CQT), chỉ *từng hóa đơn máy tính tiền* mới được miễn ký. Mỗi shop tự lo chứng thư số.

> Mốc ngày/ngưỡng có thể đổi theo thông tư hướng dẫn — chốt lại với Viettel + kế toán khi triển khai.

## 3. API Viettel S-Invoice (thực tế, để viết adapter)

Base URL:
- **Sandbox/demo:** `https://demo-sinvoice.viettel.vn:8443` (đời cũ, Basic auth + IP whitelist)
  hoặc `https://vinvoice.viettel.vn`.
- **Production:** `https://api-vinvoice.viettel.vn/services/einvoiceapplication/api/`

### 3.1 Xác thực
- **Token:** `POST /auth/login` body `{ "username": "<MST>-<suffix>", "password": "..." }`
  → trả `access_token`; gửi kèm request sau ở header `Cookie: access_token=<value>`.
- **Hoặc Basic auth** `user:pass` base64 (đời demo cũ) + **IP whitelist bắt buộc** (khai IP máy
  chủ gọi API trong phần Quản lý người dùng; sai IP/credential → `500 Request Fail`).
- → Adapter phải hỗ trợ cấu hình base URL + kiểu auth; **server của ta phải có IP tĩnh** (cân nhắc
  khi deploy Vercel — IP động; có thể cần proxy/egress IP cố định cho production).

### 3.2 Các endpoint chính
| Chức năng | Endpoint | Method |
|---|---|---|
| Phát hành | `/InvoiceAPI/InvoiceWS/createInvoice/{supplierTaxCode}` | POST |
| Nháp | `/InvoiceAPI/InvoiceWS/createOrUpdateInvoiceDraft/{supplierTaxCode}` | POST |
| Hủy | `/InvoiceAPI/InvoiceWS/cancelTransactionInvoice` | POST |
| Điều chỉnh/Thay thế | `createInvoice` với `adjustmentType` = 5 (điều chỉnh) / 3 (thay thế) | POST |
| Lấy file PDF | `/InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile` | POST |
| Tra cứu/đọc HĐ | `/InvoiceAPI/InvoiceUtilsWS/getInvoices/{supplierTaxCode}` | POST |
| Phát hành lô (≤50) | `/InvoiceAPI/InvoiceWS/createBatchInvoice/{supplierTaxCode}` | POST |

### 3.3 Body `createInvoice`
```
{
  generalInvoiceInfo: { invoiceType, templateCode, invoiceSeries,
                        transactionUuid, adjustmentType, paymentStatus,
                        currencyCode, ... },
  sellerInfo:    { ... },        // MST/tên/địa chỉ người bán (từ einvoice_config)
  buyerInfo:     { ... },        // tên/MST/địa chỉ khách (optional cho B2C)
  payments:      [ ... ],        // hình thức thanh toán
  itemInfo:      [ ... ],        // từng dòng hàng
  taxBreakdowns: [ ... ],        // bóc tách theo thuế suất
  summarizeInfo: { totalAmountWithoutTax, totalTaxAmount, totalAmountWithTax }
}
```
Trường nghiệp vụ quan trọng:
- `transactionUuid` — **khóa idempotency** (Viettel dedup trong 3 ngày). → **map = `order.id`**,
  ăn khớp với ràng buộc "1 HĐ issued / đơn" ở RPC `issue_einvoice`.
- `adjustmentType`: `1` gốc · `3` thay thế · `5` điều chỉnh · `7` hủy.
- `invoiceType` / `templateCode` / `invoiceSeries`: **HĐ máy tính tiền dùng mẫu/ký hiệu riêng** —
  ⚠️ **cần xác nhận mã chính xác với Viettel** (loại hóa đơn khởi tạo từ máy tính tiền theo TT78).
- Timestamp = epoch **milliseconds (long)**; UTF-8; timeout nên đặt **60–90s**.
- File PDF: gọi `getInvoiceRepresentationFile` sau khi tạo **2–5s**.

## 4. Khoảng cách hiện tại → cần làm

### 4.1 Adapter Viettel (`lib/einvoice/viettel.ts`)
Implement `EInvoiceProvider` ([types.ts](../../lib/einvoice/types.ts)):
1. `login()` → cache access_token (TTL ngắn, refresh khi 401).
2. `issue(order, config)`:
   - map `EInvoiceOrder` + `EInvoiceConfig` → body `createInvoice` (mục 3.3),
   - `transactionUuid = order.id`,
   - parse response → `IssueResult { series, invoiceNo, taxAuthorityCode, lookupUrl, pdfUrl, payload }`,
   - lỗi/từ chối → `{ status: "failed", error }`.
3. Đăng ký vào registry [index.ts](../../lib/einvoice/index.ts) + set `implemented: true` trong
   [providers.ts](../../lib/einvoice/providers.ts).
4. Cấu hình: thêm `base_url` + `auth_mode` (token/basic) vào `einvoice_config` (hiện đã có
   `api_endpoint/api_username/api_secret`).

### 4.2 Bóc tách thuế (gap)
`EInvoiceOrder` ([types.ts](../../lib/einvoice/types.ts)) hiện **không** mang thuế theo dòng. Viettel
cần `itemInfo[].taxPercentage`, `taxBreakdowns[]`, `summarizeInfo`. Cần:
- Mở rộng `EInvoiceOrder`/`EInvoiceOrderItem` thêm thuế suất + tiền trước/sau thuế (back-out từ giá
  gồm thuế theo `config.taxRate`, tái dùng logic đã có cho bản in `gtgt` ở 0008).
- `invoiceType = 'sales'` (mẫu 2, không tách thuế) vs `'gtgt'` (mẫu 1) đã có sẵn trong config.

### 4.3 Hủy / thay thế / điều chỉnh — gắn với đổi-trả (gap lớn nhất)
Khi `create_return` chạy (đổi/trả hàng) → HĐĐT gốc phải **điều chỉnh giảm** hoặc **thay thế**.
Hiện `einvoices` chỉ có status `cancelled` rời rạc, **chưa liên kết HĐ gốc ↔ HĐ thay thế/điều chỉnh**.
Cần (phase sau):
- Thêm cột `adjustment_type` + `replaces_einvoice_id` (self-FK) vào `einvoices`.
- RPC mới `adjust_einvoice` / `cancel_einvoice` (security definer, RBAC) + endpoint Viettel tương ứng.
- Nới RPC `issue_einvoice` cho phép status `pending` (Viettel có thể trả async).

### 4.4 Bảo mật credential (gap)
`api_secret` đang lưu **plaintext** trong `einvoice_config`. → mã hóa bằng **Supabase Vault/pgsodium**;
chỉ giải mã phía server (service role) khi gọi API. RLS hiện cho owner/admin đọc — không để lộ secret
ra client.

### 4.5 Hạ tầng
- **IP tĩnh** cho server gọi Viettel (whitelist). Vercel serverless → cần egress IP cố định / proxy.
- Timeout 60–90s → đảm bảo server action / route không bị cắt sớm.

## 5. Lộ trình

| Phase | Nội dung | Đụng tới |
|---|---|---|
| **P0** | Adapter Viettel chạy **sandbox**, phát hành 1 đơn end-to-end (loại máy tính tiền) + bóc tách thuế | `lib/einvoice/viettel.ts`, mở rộng `types.ts`, `einvoice_config` |
| **P1** | Hủy/thay thế/điều chỉnh gắn `create_return`; xử lý `pending`; mã hóa secret | migration mới, RPC `adjust/cancel_einvoice` |
| **P2** | IP tĩnh production + onboarding (đăng ký 01/ĐKTĐ, mẫu/ký hiệu máy tính tiền) | hạ tầng, UI settings |
| **P3** | (tách doc) Chuyển **Mô hình 2 — reseller** để bundle "HĐĐT miễn phí" đấu KiotViet | API đối tác Viettel |

## 6. Checklist onboarding mỗi shop (Mô hình 1)
- [ ] Có MST + chứng thư số (để ký tờ khai đăng ký).
- [ ] Ký hợp đồng Viettel S-Invoice, lấy `username/password` API + đăng ký IP whitelist.
- [ ] Đăng ký **Mẫu 01/ĐKTĐ-HĐĐT** chọn hình thức **máy tính tiền**, khai mẫu số/ký hiệu → chờ CQT chấp nhận.
- [ ] Nhập credential + mẫu số/ký hiệu vào `/settings/einvoice`.
- [ ] Phát hành thử 1 đơn sandbox → kiểm mã CQT + link tra cứu.

## 7. Rủi ro / câu hỏi mở
- Mã `invoiceType`/`templateCode` chính xác cho **hóa đơn máy tính tiền** — phải xin từ Viettel.
- Viettel trả mã CQT **đồng bộ hay async**? Quyết định có cần luồng `pending` + poll/webhook.
- Egress IP tĩnh trên hạ tầng deploy hiện tại (Vercel?) — chặn production nếu chưa có.
- Mô hình 1 BYO: trải nghiệm onboarding nặng (shop tự đăng ký) → là lý do nên sớm lên Mô hình 2.

## Nguồn
- NĐ 70/2025 máy tính tiền: einvoice.vn, expertis.vn, xaydungchinhsach.chinhphu.vn (Mục 2).
- API Viettel S-Invoice: tlptech.vn (mô tả webservice), viettel-invoice.vn (Postman),
  viettelsolution.com.vn (tài liệu kỹ thuật EN).
