# 0004 — Quy tắc component & bề mặt

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0001](0001-design-language.md), [0002](0002-color-tokens.md), [0003](0003-typography.md)

## Bối cảnh

Build spec dùng **shadcn/ui**. ADR này định nghĩa cách customize shadcn bám đúng
tokens 0002/0003 và đặt quy tắc cho các bề mặt/component lõi, để mọi UI sau này
nhất quán.

## Quyết định

### Nền tảng

- **shadcn/ui** làm base; **không** dùng default thô — override theme variable
  trỏ vào tokens 0002 (primary, semantic, radius, shadow).
- **Icon:** `lucide-react` (đi cùng shadcn), stroke 1.5–2px, cỡ theo `text` cạnh nó.
- Mọi component nhận biến density (`data-density`), mặc định `compact` cho bề mặt
  nghiệp vụ, `comfortable` cho dashboard/form/onboarding/billing.
- **Motion:** dùng `--duration-fast 150ms` / `--duration-normal 300ms`, easing
  `cubic-bezier(.16,1,.3,1)`; chỉ animate `transform`/`opacity`/`color`. Tôn trọng
  `prefers-reduced-motion`.

### Bề mặt (surface)

- **Card/panel:** `--surface`, viền `--border`, radius `lg` (14), `--shadow-sm`
  mặc định; nâng `--shadow-md` khi nổi (hover card hành động, popover).
- **Page shell:** nền `--bg`; nội dung trong card/section trên nền đó (tạo lớp).
- Phân lớp bằng **surface + border + shadow**, không bằng đường kẻ nặng.

### Button

Variants & dùng cho:

| Variant | Nền / chữ | Dùng cho |
|---|---|---|
| `primary` | `--primary` / `--primary-fg` | hành động chính (Lưu, Thanh toán) |
| `secondary` | `--surface-2` / `--fg` | hành động phụ |
| `outline` | trong suốt + `--border` / `--fg` | phụ, trên nền card |
| `ghost` | trong suốt / `--fg` | icon button, toolbar, nav |
| `destructive` | `--danger` / trắng | xóa, hủy nguy hiểm |

- Radius `md` (10). Cỡ: `sm` (h32), `md` (h36, mặc định), `lg` (h44).
- **States bắt buộc:** hover (đậm 1 nấc: dùng `--primary-hover`…), active (đậm nấc
  2), focus-visible (`--ring` + offset 2px), disabled (opacity .5, `cursor-not-allowed`),
  **loading** (spinner + giữ chiều rộng, khóa click).
- Chữ weight 500, không UPPERCASE (trừ label nhỏ).

### Input / control — **Soft-filled**

- Mặc định: nền `--surface-2`, viền `1px --border` rất mảnh, radius `md`, chữ `md`.
- **States:** hover (nền sáng nhẹ), **focus** (`--ring` 2px + nền lên `--surface` +
  viền `--primary`), error (viền + ring `--danger`, helper text `--danger-fg`),
  disabled (opacity .5), readonly (bỏ viền, nền `--surface-2`).
- Áp cho: text, textarea, select, combobox, search (POS), number, date.
- **Label** trên input, `text-sm`/`--fg-muted`; helper/error `text-xs` dưới input.
- Required đánh dấu `*` màu `--danger`. Validation theo Zod (thông báo tiếng Việt).

### Table dữ liệu — **Ruled + hover**, compact

- **Đường kẻ ngang mảnh** giữa hàng (`--border`), KHÔNG zebra, KHÔNG kẻ dọc.
- **Hover:** cả hàng nền `--surface-2`.
- **Header:** `text-xs` UPPERCASE, `--fg-muted`, letter-spacing +0.05em,
  **sticky top** khi cuộn; viền dưới `--border-strong`.
- **Cột số** (tiền/SL): căn **phải** + `.tnum` (tabular). Cột text căn trái.
- Density `compact`: row 36px, cell pad `6/12`. Có thể bật `comfortable` (48px).
- **Row chọn/active:** nền `--primary-bg`, viền trái 2px `--primary`.
- **Trạng thái:** loading → skeleton rows; empty → empty state (xem dưới); error →
  thông báo + nút thử lại. KHÔNG để bảng trống không giải thích.
- Hàng nhiều → phân trang (LIMIT, theo rule perf); cân nhắc sticky cột đầu (tên SP).

### Badge / chip ngữ nghĩa

- Nền `*-bg`, chữ `*-fg`, radius `full`, `text-xs`, pad `2/8`.
- Map: còn hàng/đã TT → `success`; sắp hết/nợ tới hạn → `warning`; hết hàng/quá hạn
  → `danger`; nháp/trung tính → `info` hoặc neutral.

### Feedback & overlay

- **Toast:** góc trên-phải, auto-dismiss ~4s, có icon ngữ nghĩa; lỗi không tự ẩn.
- **Dialog/Sheet:** overlay `oklch(22% .01 80 / .4)`, panel `--surface` radius `xl`,
  `--shadow-lg`; focus-trap + đóng bằng Esc; hành động nguy hiểm cần xác nhận.
- **Empty state:** icon nhạt + tiêu đề + 1 câu mô tả + CTA chính (vd "Thêm sản phẩm").
- **Skeleton:** khối `--surface-2` bo `md`, shimmer nhẹ (tôn trọng reduced-motion).

### Accessibility (cứng)

- Mọi control có focus-visible rõ (`--ring`), thao tác được bằng bàn phím.
- Tương phản đạt WCAG AA (đã nêu ở 0002).
- Icon-only button phải có `aria-label`.

## Triển khai (khi tới UI)

- Cài shadcn, sửa file theme → trỏ tokens 0002; tạo `.tnum`, biến density.
- Bọc primitive shadcn thành component dự án (`components/ui/*`) đã gắn variant/states
  ở trên; feature components dùng lại, không tự style rời rạc.

## Phương án đã cân nhắc & loại

- **Input outlined / underlined:** outlined an toàn nhưng "tool-y" hơn; underlined
  affordance yếu cho form dày → chọn soft-filled (mềm + vẫn rõ).
- **Table zebra / borderless:** zebra trông đông, borderless khó dò ở mật độ cao →
  chọn ruled+hover (rõ + sạch).
