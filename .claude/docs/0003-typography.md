# 0003 — Typography

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14
- **Liên quan:** [0001](0001-design-language.md), [0002](0002-color-tokens.md)

## Bối cảnh

App dày dữ liệu, người Việt dùng → cần đủ dấu tiếng Việt + số đẳng chiều
(tabular) cho cột tiền/SL. Đồng thời cần "cá tính" cho heading/marketing để giữ
cảm giác Light luxury, nhưng UI ở cỡ nhỏ phải cực dễ đọc.

## Quyết định

### Hai họ font

| Vai trò | Font | Lý do |
|---|---|---|
| **Display** (heading, page title, hero marketing) | **Fraunces** (serif, variable) | Cá tính editorial/luxury, đủ subset `vietnamese`, có optical sizing. |
| **UI** (body, label, bảng, **số liệu**) | **Be Vietnam Pro** (sans, variable) | Thiết kế riêng cho tiếng Việt, dấu đẹp, sạch ở cỡ nhỏ, có tabular figures. |

- **Tối đa 2 họ.** Không thêm font thứ 3. Mã SKU/barcode dùng Be Vietnam Pro +
  `.tnum` (không thêm họ mono riêng).
- CSS var: `--font-display` (Fraunces), `--font-sans` (Be Vietnam Pro).
  `--font-sans` là mặc định cho `body`.

### Áp dụng vai trò

- `h1/h2`, page title, hero (chữ) → `--font-display` (Fraunces).
- `h3` trở xuống, toàn bộ UI, bảng, form, nút → `--font-sans`.
- **MỌI con số** (KPI, tiền, SL, mã) → **`--font-sans` + `.tnum`**, KHÔNG serif.
- Bề mặt **nghiệp vụ** (bảng/POS) **không** dùng serif → giữ gọn, đồng nhất.

> **Amendment 2026-06-14:** Bản đầu cho "số liệu KPI lớn → display". Thực tế chữ
> số serif (Fraunces) nhìn điệu, lạc quẻ với số tiền và làm ký hiệu `₫` xấu →
> chuyển toàn bộ con số sang sans + tabular. Serif chỉ cho tiêu đề chữ.

### Type scale (base 14px)

| Token | size / line-height | letter-spacing | dùng cho |
|---|---|---|---|
| `--text-xs` | 12 / 16 | +0.04em nếu UPPERCASE | badge, header bảng |
| `--text-sm` | 13 / 18 | 0 | ô bảng compact, caption |
| `--text-base` | 14 / 20 | 0 | UI mặc định |
| `--text-md` | 16 / 24 | 0 | body thoải mái, input |
| `--text-lg` | 18 / 26 | 0 | sub-heading |
| `--text-xl` | 20 / 28 | −0.01em | card title |
| `--text-2xl` | 24 / 32 | −0.015em | section heading (display) |
| `--text-3xl` | 30 / 38 | −0.02em | page title (display) |
| `--text-display` | `clamp(2.5rem, 1.5rem + 4vw, 4rem)` / 1.05 | −0.02em | hero marketing (display) |

### Weight

- **Be Vietnam Pro:** 400 (body), 500 (label, button, nav active), 600 (heading UI).
- **Fraunces:** 400/500 cho heading thường, 600 cho hero. Tận dụng trục variable
  `opsz` (optical size) tăng theo cỡ lớn.
- Không dùng 300 (mảnh quá, vỡ ở dark + cỡ nhỏ).

### Số liệu (quan trọng)

- Mọi ô tiền/số lượng/SL/mã: `font-variant-numeric: tabular-nums lining-nums`
  qua utility `.tnum` (fallback `font-feature-settings: "tnum" 1, "lnum" 1`).
- Mục tiêu: các cột số **thẳng cột**, dễ dò sai lệch.
- Khi triển khai: verify Be Vietnam Pro render `tnum` đúng; nếu lệch, mở issue +
  cân nhắc fallback numeric — KHÔNG âm thầm bỏ qua.

## Performance (theo rule web)

- Dùng `next/font/google`, subset **`latin` + `vietnamese`**, `display: swap`.
- Variable font cả hai họ → ít file, nhiều weight.
- **Preload** chỉ weight UI chính (Be Vietnam Pro 400/500). Fraunces nạp
  non-blocking (heading chấp nhận swap).
- Bỏ Geist/Geist_Mono mặc định trong `app/layout.tsx`.

## Triển khai (khi tới UI)

- `layout.tsx`: nạp 2 font → gán `--font-display`, `--font-sans` lên `<html>`.
- `globals.css` `@theme`: map `--font-sans`/`--font-display`, khai báo thang
  `--text-*` + line-height tương ứng.
- Tạo utility `.tnum` (hoặc `@utility tnum` Tailwind v4) áp lên cell số.

## Phương án đã cân nhắc & loại

- **Space Grotesk + Inter / Newsreader + Plus Jakarta:** đẹp & an toàn nhưng kém
  điểm "native VN + luxury ấm" so với cặp đã chọn.
- **Chỉ Inter:** nhẹ & an toàn nhất nhưng thiếu cá tính, dễ giống template → loại.
