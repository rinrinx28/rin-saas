# 0001 — Ngôn ngữ thiết kế (Design language)

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0000](0000-working-agreement.md)

## Bối cảnh

`rin-saas` là app **dày dữ liệu**: bảng sản phẩm, màn bán hàng (POS), tồn kho
theo chi nhánh, báo cáo. Người dùng nhìn màn hình lâu, cần đọc số nhanh, thao
tác lặp lại nhiều. Đồng thời sản phẩm muốn cảm giác **cao cấp, đáng tin** để
khác biệt với các tool POS "công cụ thuần".

## Quyết định

### Hướng thị giác: **Light luxury SaaS**

Cảm giác cao cấp đến từ **chất liệu**, không phải từ việc nới rộng mọi thứ:

- Typography có gu, phân cấp rõ bằng tương phản cỡ chữ (scale contrast).
- Bề mặt phân lớp tinh tế: card mềm, đổ bóng nhẹ nhiều tầng, viền mảnh.
- Nhịp khoảng trắng có chủ đích (không padding đều nhau khắp nơi).
- Accent màu dùng **theo ngữ nghĩa** (doanh thu / cảnh báo tồn / công nợ), không
  chỉ trang trí.
- Chuyển động làm rõ luồng (transition trên `transform`/`opacity`), không phô trương.

### Nguyên tắc cân bằng "luxury vs. mật độ" (QUAN TRỌNG)

Luxury **không** được làm giảm mật độ dữ liệu ở bề mặt nghiệp vụ.

- **Surface "marketing/khái quát"** (dashboard tổng quan, card KPI, onboarding,
  trang billing): thoáng, sang, spacing rộng, bóng mềm.
- **Surface "nghiệp vụ"** (bảng SP/tồn kho, màn POS, danh sách order): **nén gọn**
  — hàng bảng thấp, padding chặt, ưu tiên số dòng/màn hình. Cao cấp thể hiện qua
  typography + viền + hover states tinh tế, **không** qua khoảng trắng dư.
- Có **2 mức density** (comfortable / compact) như một biến thiết kế; bề mặt
  nghiệp vụ mặc định `compact`.

### Theme

- **Light là mặc định** (POS dùng ban ngày, gắn với in bill/hóa đơn giấy).
- **Dark mode hỗ trợ đầy đủ** — cả hai theme phải trông có chủ đích, không phải
  "đảo màu cho có".
- KHÔNG mặc định dark.

### Yêu cầu chất lượng (mỗi bề mặt đạt ≥4 tiêu chí)

1. Phân cấp rõ qua tương phản cỡ chữ.
2. Nhịp spacing có chủ đích.
3. Chiều sâu/phân lớp qua bề mặt, bóng, overlap.
4. Typography có cá tính + chiến lược pairing thật.
5. Màu dùng theo ngữ nghĩa.
6. Hover / focus / active states được thiết kế tử tế.
7. Data-viz là một phần của design system, không phải thêm sau.

## Phương án đã cân nhắc & loại

- **Swiss / data-dense clean:** rất hợp app nghiệp vụ nhưng kém điểm khác biệt
  thương hiệu → loại, nhưng **mượn kỷ luật mật độ** của nó cho surface nghiệp vụ.
- **Neo-brutalism:** cá tính mạnh nhưng kén với B2B/SMB nghiêm túc, khó đọc số lâu → loại.

## Hệ quả / việc tiếp theo

- ADR 0002: chốt bảng màu & tokens (light + dark, accent ngữ nghĩa, radius, shadow,
  2 mức density spacing).
- ADR 0003: chốt font pairing + type scale.
- ADR 0004: quy tắc component (card, table compact, form, button/input states).
- Thay `globals.css` mặc định (Geist + đảo màu thô) bằng token theo các ADR trên.
