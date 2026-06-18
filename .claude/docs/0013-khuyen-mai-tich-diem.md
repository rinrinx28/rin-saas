# 0013 — Giữ chân: Khuyến mãi & Tích điểm khách hàng

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-17
- **Liên quan:** [0005](0005-feature-route-map.md), [0006](0006-customer-debt … N/A), [0012](0012-doi-tra-ca-so-quy.md)

## Vấn đề

POS mới chỉ có **chiết khấu tay** tại quầy. Thiếu hai đòn bẩy giữ chân quen thuộc
của POS Việt Nam:

1. **Khuyến mãi** — giảm giá theo chương trình (％ hoặc số tiền), có hiệu lực theo
   thời gian, ngưỡng đơn tối thiểu, mã coupon.
2. **Tích điểm** — khách tích điểm theo chi tiêu, đổi điểm trừ tiền lần sau.

Cả hai **áp tại `create_sale`** (atomic cùng đơn) để không lệch tiền/điểm.

## Quyết định

### Áp dụng trong `create_sale` (đổi chữ ký, drop bản cũ)

`create_sale` thêm 2 tham số **có default** (giữ tương thích, nhưng vì đổi chữ ký
nên **drop** bản 6 tham số cũ rồi tạo bản mới):

```
create_sale(p_store, p_customer, p_discount, p_items, p_method, p_paid,
            p_code text default null,           -- mã khuyến mãi (coupon)
            p_redeem_points integer default 0)  -- số điểm muốn đổi
```

Thứ tự tính tiền (mỗi bước kẹp ≥ 0):

```
subtotal            = Σ qty·price
discount_total      = clamp(p_discount(tay) + promo_discount, 0, subtotal)
pre_loyalty_total   = subtotal − discount_total
redeem_value        = giá trị quy đổi của điểm dùng, kẹp ≤ pre_loyalty_total
total               = pre_loyalty_total − redeem_value
```

Đơn lưu thêm: `promotion_id`, `promo_discount`, `points_redeemed`, `redeem_value`,
`points_earned`. `orders.discount` = `discount_total` (gồm cả promo) để báo cáo &
hoá đơn không phải đổi công thức tổng.

### A. Khuyến mãi — `promotions`

```
promotions(
  id, org_id, name,
  code            text,            -- null = tự áp (công khai); có mã = coupon
  type            check (percent|amount),
  value           integer,         -- percent: 1..100 ; amount: đồng
  min_order       integer default 0,
  max_discount    integer,         -- trần giảm cho loại percent (null = không trần)
  starts_at, ends_at timestamptz,  -- null = không giới hạn
  active          boolean default true
)
unique (org_id, lower(code)) where code is not null
```

Helper `promo_discount(p_org, p_subtotal, p_code)` → `jsonb{discount, promotion_id}`:
chọn **giảm lớn nhất** trong số: KM công khai (code null) đang hiệu lực &
`subtotal ≥ min_order`, **hợp** với KM theo mã nếu `p_code` khớp. percent =
`floor(subtotal·value/100)` (kẹp `max_discount`); amount = `least(value, subtotal)`.

> MVP: khuyến mãi **mức đơn**. KM theo sản phẩm/combo/mua-X-tặng-Y để pha sau
> (bảng đã có `type` để mở rộng).

### B. Tích điểm — cấu hình ở `organizations`, điểm ở `customers`

Cấu hình theo tổ chức (mở rộng `organizations` như cột `plan`):

```
loyalty_enabled          boolean default false
loyalty_earn_per_k       integer default 0   -- điểm cộng / 1.000đ chi tiêu (total)
loyalty_redeem_value     integer default 1000-- 1 điểm = ? đồng khi đổi
loyalty_min_redeem       integer default 0   -- số điểm tối thiểu mỗi lần đổi
```

`customers.points integer default 0`. Sổ điểm `loyalty_ledger(org, customer, order,
delta, kind earn|redeem, created_at)` để kiểm toán.

Trong `create_sale` khi bật loyalty & có khách:
- **Đổi điểm:** `pts = min(p_redeem_points, customer.points)`; nếu
  `pts < loyalty_min_redeem` → bỏ qua. `redeem_value = pts · loyalty_redeem_value`
  (kẹp ≤ pre_loyalty_total). Trừ `customer.points -= pts`, ghi ledger `redeem`.
- **Tích điểm:** `earned = floor(total / 1000) · loyalty_earn_per_k`. Cộng
  `customer.points += earned`, ghi ledger `earn`. (Tích trên `total` sau giảm giá.)

## Phạm vi & route

- `/promotions` — danh sách + tạo/sửa/bật-tắt/xoá chương trình (quản lý).
- `/settings` — thêm thẻ **Tích điểm** (bật + 3 thông số), quyền quản lý.
- POS: ô nhập **mã KM** + (khi chọn khách & bật loyalty) **dùng điểm** — POS gọi
  server action `preview` (dùng `promo_discount` + công thức redeem) để hiện tổng
  đúng trước khi thu tiền; `create_sale` là nguồn chân lý cuối.
- Khách hàng: hiển thị **điểm** ở danh sách & chi tiết.
- Nav: nhóm Bán hàng thêm “Khuyến mãi”.

## Hệ quả

- `create_sale` đổi chữ ký 8 tham số; cập nhật `createSaleAction` (POS) truyền
  `p_code`, `p_redeem_points` (mặc định null/0 → hành vi cũ giữ nguyên).
- Báo cáo lãi/doanh thu dùng `orders.total`/`discount` nên không vỡ; có thể tách
  `promo_discount` khi cần phân tích.
- Điểm & tiền đổi điểm là **khuyến mại**, không phải tiền thật → không vào sổ quỹ.
