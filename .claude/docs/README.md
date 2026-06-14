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

## Sắp tới (đang chờ brainstorm + duyệt)

- (Bám lộ trình Phase 1→4 trong 0005; ADR mới phát sinh theo tính năng cụ thể.)
