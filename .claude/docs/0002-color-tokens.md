# 0002 — Bảng màu & design tokens

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0001](0001-design-language.md)

## Bối cảnh

Cần một hệ token màu/spacing/độ bo/đổ bóng cụ thể, dùng được trực tiếp, cho cả
light (mặc định) và dark, theo hướng **Light luxury SaaS** + kỷ luật mật độ.

## Quyết định

Dùng **oklch** cho mọi màu. Nguyên tắc:

- Nền **không trắng tinh** → giấy hơi ấm (hue ~80, chroma rất nhỏ).
- Chữ là **mực ấm**, không đen tuyệt đối.
- **Màu thương hiệu = Indigo/violet (hue 280)**, tách bạch khỏi màu ngữ nghĩa.
- Màu ngữ nghĩa tách bạch theo vai trò; mỗi màu có `-bg` (tint nền) + `-fg`
  (chữ/icon đọc được trên tint đó).

### Neutrals (hue 80, hơi ấm)

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--bg` | `oklch(98.5% .004 80)` | `oklch(18% .008 80)` | nền app |
| `--surface` | `oklch(99.5% .003 80)` | `oklch(21.5% .008 80)` | card, panel |
| `--surface-2` | `oklch(96.5% .005 80)` | `oklch(25% .009 80)` | muted bg, hàng zebra, hover row |
| `--border` | `oklch(92% .006 80)` | `oklch(30% .01 80)` | viền mặc định |
| `--border-strong` | `oklch(86% .007 80)` | `oklch(38% .012 80)` | viền nhấn, divider đậm |
| `--fg` | `oklch(22% .01 80)` | `oklch(95% .005 80)` | chữ chính |
| `--fg-muted` | `oklch(50% .012 80)` | `oklch(68% .012 80)` | chữ phụ, label |
| `--fg-subtle` | `oklch(62% .01 80)` | `oklch(56% .012 80)` | placeholder, chú thích |

### Primary — Indigo/violet (hue 280)

| Token | Light | Dark |
|---|---|---|
| `--primary` | `oklch(52% .17 280)` | `oklch(66% .16 280)` |
| `--primary-hover` | `oklch(46% .17 280)` | `oklch(72% .15 280)` |
| `--primary-active` | `oklch(42% .17 280)` | `oklch(60% .16 280)` |
| `--primary-fg` | `oklch(99% 0 0)` | `oklch(16% .02 280)` |
| `--primary-bg` (tint) | `oklch(95% .03 280)` | `oklch(30% .06 280)` |
| `--ring` (focus) | `oklch(52% .17 280)` | `oklch(66% .16 280)` |

### Màu ngữ nghĩa

`-fg` = chữ/icon trên nền thường; `-bg` = nền badge/hàng; `-on-bg` = chữ trên `-bg`.

| Vai trò | Hue | `-fg` Light / Dark | `-bg` Light / Dark | Dùng cho |
|---|---|---|---|---|
| `success` | 150 | `oklch(52% .13 150)` / `oklch(72% .14 150)` | `oklch(95% .04 150)` / `oklch(27% .05 150)` | doanh thu, đã TT, còn hàng |
| `warning` | 75 | `oklch(55% .12 75)` / `oklch(78% .14 75)` | `oklch(95% .05 75)` / `oklch(30% .05 75)` | sắp hết hàng, nợ tới hạn |
| `danger` | 27 | `oklch(54% .19 27)` / `oklch(70% .17 27)` | `oklch(95% .04 27)` / `oklch(30% .07 27)` | hết hàng, quá hạn, xóa |
| `info` | 240 | `oklch(54% .12 240)` / `oklch(72% .12 240)` | `oklch(95% .03 240)` / `oklch(30% .05 240)` | trạng thái trung tính |

> Lưu ý tương phản: `warning` (hổ phách) sáng → KHÔNG dùng làm nền nút có chữ
> trắng; dùng `warning-fg` cho chữ/icon, `warning-bg` cho chip. Mọi cặp chữ/nền
> phải đạt WCAG AA (≥4.5:1 cho body, ≥3:1 cho chữ lớn/icon).

### Bo góc (radius)

| Token | px |
|---|---|
| `--radius-sm` | 6 |
| `--radius-md` (base) | 10 |
| `--radius-lg` | 14 |
| `--radius-xl` | 20 |
| `--radius-full` | 9999 |

### Đổ bóng (nhiều lớp, mảnh — ám warm-neutral, opacity thấp)

| Token | Giá trị (light) |
|---|---|
| `--shadow-sm` | `0 1px 2px oklch(22% .01 80 / .06)` |
| `--shadow-md` | `0 2px 4px oklch(22% .01 80 / .05), 0 4px 12px oklch(22% .01 80 / .07)` |
| `--shadow-lg` | `0 4px 8px oklch(22% .01 80 / .06), 0 12px 28px oklch(22% .01 80 / .10)` |

> Dark mode: bóng dựa trên `oklch(0% 0 0 / …)` với opacity cao hơn (~1.6×) +
> dựa thêm vào `border` để tách lớp, vì bóng tối khó thấy trên nền tối.

### Spacing & density

- Lưới gốc **4px**. Thang: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.
- Hai mức density (từ [0001](0001-design-language.md)):

| | row height | cell padding (Y/X) | mặc định cho |
|---|---|---|---|
| `comfortable` | 48px | 12 / 16 | dashboard, KPI, form, onboarding, billing |
| `compact` | 36px | 6 / 12 | bảng SP/tồn kho, POS, danh sách order |

## Triển khai (khi tới UI)

- Khai báo token trong `app/globals.css` qua `@theme` (Tailwind v4): neutrals,
  primary, semantic (kèm `-bg`/`-fg`), radius, shadow.
- Dark mode qua `.dark` class (next-themes), KHÔNG dùng `prefers-color-scheme`
  cứng như file mặc định hiện tại.
- Density qua `data-density="compact|comfortable"` ở container, map ra biến
  `--row-h` / `--cell-py` / `--cell-px`.
- Thay toàn bộ block màu mặc định (Geist + đảo màu thô) trong `globals.css`.

## Phương án đã cân nhắc & loại

- **Deep teal / Plum / Ink+gold:** đẹp nhưng đụng (gần) màu ngữ nghĩa
  (info/danger/warning), phải dịch hue ngữ nghĩa → rủi ro loạn nghĩa. Indigo tách
  bạch sạch nhất cho app dày dữ liệu → chọn Indigo.
- **Nền trắng tinh + xám lạnh:** đúng "template SaaS" mặc định, thiếu cảm giác
  cao cấp → loại, dùng neutrals ấm.
