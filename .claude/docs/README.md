# Tài liệu quyết định — rin-saas

Thư mục này là **nguồn chân lý (single source of truth)** cho mọi quyết định
thiết kế & quy ước của dự án. Mỗi quyết định đã duyệt được ghi thành một
**ADR** (Architecture / Design Decision Record) đánh số.

## Cách hoạt động

1. Đề xuất → bàn → **duyệt** → mới ghi ADR `Accepted` → mới code.
2. Code **không được lệch** với ADR đang ở trạng thái `Accepted`.
3. Muốn đổi quyết định cũ: tạo ADR mới `Supersedes #N`, **không sửa lén** file cũ
   (chỉ đổi status file cũ thành `Superseded` + trỏ tới ADR mới).
4. Tài liệu viết bằng **tiếng Việt**.

## Trạng thái ADR

`Proposed` → `Accepted` → `Superseded` (hoặc `Rejected`).

## Mục lục

| #    | Tiêu đề                                              | Trạng thái |
| ---- | --------------------------------------------------- | ---------- |
| 0000 | [Cách làm việc & quy tắc dự án](0000-working-agreement.md) | Accepted   |
| 0001 | [Ngôn ngữ thiết kế (Design language)](0001-design-language.md) | Accepted   |
| 0002 | [Bảng màu & design tokens](0002-color-tokens.md)     | Accepted   |
| 0003 | [Typography](0003-typography.md)                     | Accepted   |
| 0004 | [Quy tắc component & bề mặt](0004-component-rules.md) | Accepted   |
| 0005 | [Bản đồ tính năng & route (IA)](0005-feature-route-map.md) | Accepted   |
| 0006 | [Hoạt ảnh với GSAP](0006-animation-gsap.md)          | Accepted   |
| 0007 | [Lưu trữ ảnh (Supabase Storage)](0007-image-storage.md) | Accepted   |
| 0008 | [Hóa đơn điện tử (HĐĐT)](0008-hoa-don-dien-tu.md)     | Accepted   |
| 0009 | [Thanh toán: cấu hình TK, QR & cổng](0009-thanh-toan-qr-cong.md) | Accepted   |
| 0009b | [HĐĐT Viettel — máy tính tiền](0009-hddt-viettel-may-tinh-tien.md) | Accepted   |
| 0010 | [Đối soát chuyển khoản tự động](0010-doi-soat-tu-dong.md) | Accepted   |
| 0011 | [Nhân sự: vai trò, chi nhánh & lời mời](0011-nhan-su-vai-tro-loi-moi.md) | Accepted   |
| 0012 | [Đổi/trả, ca bán hàng & sổ quỹ](0012-doi-tra-ca-so-quy.md) | Accepted   |
| 0013 | [Giữ chân: khuyến mãi & tích điểm](0013-khuyen-mai-tich-diem.md) | Accepted   |
| 0014 | [Gói cước, thanh toán & giới hạn](0014-goi-cuoc-thanh-toan-gioi-han.md) | Accepted   |

> ⚠️ Có **hai** file mang số `0009` (lịch sử trùng số): `0009-thanh-toan-qr-cong.md`
> và `0009-hddt-viettel-may-tinh-tien.md` (ghi `0009b` ở mục lục). Đổi số chuẩn khi
> có dịp dọn tài liệu — không sửa lén nội dung.

## Sắp tới (đang chờ brainstorm + duyệt)

- (Bám lộ trình Phase 1→4 trong 0005; ADR mới phát sinh theo tính năng cụ thể.)
- In bill máy nhiệt ESC-POS (K57/K80) — cần print agent local.
- HĐĐT: cắm provider thật (Viettel/MISA/VNPT) thay adapter stub.
- Gói cước (0014): nhắc gia hạn, biên nhận thuê bao, lịch sử thanh toán.
