# 0012 — Vận hành quầy: Đổi/trả hàng, Ca bán hàng & Sổ quỹ thu chi

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-17
- **Liên quan:** [0005](0005-feature-route-map.md), [0011](0011-nhan-su-vai-tro-loi-moi.md)

## Vấn đề

POS lõi đã bán/ghi nợ/đối soát tốt, nhưng thiếu 3 nghiệp vụ vận hành quầy hằng
ngày khiến cửa hàng từ chối dùng thử:

1. **Đổi/trả hàng** — mới chỉ `cancel_order` (huỷ đơn chưa thu). Chưa có trả một
   phần đơn đã hoàn tất: hoàn tồn kho + hoàn tiền / giảm công nợ.
2. **Mở ca / chốt ca** — đầu ca đếm tiền, cuối ca đối chiếu tiền mặt thực tế với
   kỳ vọng (lệch quỹ). Không có thì chủ không kiểm soát được tiền mặt.
3. **Sổ quỹ thu chi** — phiếu thu/chi tiền mặt tự do (trả tiền điện, ứng lương,
   góp quỹ…) ngoài bán hàng & công nợ.

3 việc này gắn nhau qua **tiền mặt**: tiền bán + thu/chi + hoàn trả của một chi
nhánh trong một ca phải khớp khi chốt.

## Quyết định

### Nguyên tắc nền (giữ nguyên kiến trúc hiện có)

- Tiền & số lượng = `integer` (đồng). Mọi mutation qua **RPC `security definer`**
  + `is_org_member` + ghi `stock_movements`/sổ quỹ để kiểm toán.
- **Không sửa `create_sale`** ở ADR này. Tiền bán mặt được suy ra khi chốt ca
  bằng cách tổng hợp `payments(method='cash')` theo cửa hàng trong khung giờ ca →
  tránh viết đè `create_sale` (sẽ bị promo/loyalty đụng ở ADR 0013).

### A. Ca bán hàng — `shifts` + định nghĩa ca `shift_definitions`

Một chi nhánh chỉ **một ca mở** tại một thời điểm (kiểu một két/quầy). Ca được
**định nghĩa sẵn trong settings** (Ca sáng/chiều/tối…) thay vì gõ tự do.

**Định nghĩa ca (mẫu ca) — kế thừa & ghi đè:**
```
shift_definitions(
  id, org_id,
  store_id,                 -- null = bộ mặc định cửa hàng (áp mọi CN)
                            --        có giá trị = bộ riêng của chi nhánh (ghi đè)
  name, start_time, end_time, sort_order, active
)
```
`effective_shift_definitions(p_store)`: nếu chi nhánh **có** bộ riêng (≥1 active)
→ chỉ lấy bộ riêng; ngược lại **kế thừa** bộ mặc định cửa hàng (`store_id null`).

**Cấu hình tiền đầu ca (cấp tổ chức) — 3 chế độ:** `organizations`
```
shift_opening_mode  check (carry | fixed | manual)   -- mặc định 'manual'
shift_fixed_float   integer                           -- định mức quỹ lẻ (mode 'fixed')
```
- **carry (cuốn chiếu):** đầu ca = tiền đếm cuối ca trước (tiền ở lại trong két).
- **fixed (định mức):** đầu ca = `shift_fixed_float` cố định.
- **manual (nhập tay):** thu ngân gõ mỗi lần.

**Phiên ca:**
```
shifts(
  id, org_id, store_id,
  definition_id, shift_name,                     -- snapshot tên ca lúc mở
  opened_by, opened_at, opening_cash, opening_mode,
  closed_by, closed_at, closing_cash_counted,    -- tiền đếm thực tế cuối ca
  closing_breakdown jsonb,                        -- đếm theo mệnh giá {"500000":3,...}
  expected_cash, diff,                            -- diff = counted − expected (lệch quỹ)
  status check (open|closed), note
)
unique index một phần: 1 ca open / store
```

- `open_shift(p_store, p_definition, p_opening_cash, p_note)` → lỗi nếu CN đang có
  ca mở; `p_definition` (tuỳ chọn) phải nằm trong bộ hiệu lực của CN; tiền đầu ca
  **tự tính theo `shift_opening_mode`** (`p_opening_cash` chỉ dùng khi `manual`).
- `close_shift(p_shift, p_counted, p_note, p_breakdown)` → nếu có `p_breakdown`
  (bảng mệnh giá) thì **tổng đếm = Σ mệnh_giá × số_tờ** (server tự cộng), ngược
  lại dùng `p_counted`. Tính
  `expected = opening + tiền_mặt_bán(ca) + thu_mặt − chi_mặt`,
  `diff = counted − expected`. Chỉ người tạo ca hoặc quản lý được chốt.
- `current_shift(p_store)` → ca mở của chi nhánh (hoặc null) để UI gắn phiếu.
- **Bán hàng KHÔNG bị chặn** khi không có ca mở — ca chỉ là lớp kiểm soát tiền mặt.

> Nâng cao về sau (đã phác): bàn giao ca, X/Z report, nhiều quầy song song, phân ca
> nhân viên, báo cáo theo ca/nhân viên/quầy.

### B. Sổ quỹ — `cash_ledger`

Sổ tiền mặt hợp nhất của chi nhánh (chỉ ghi các luồng **không phải** bán hàng;
tiền bán suy ra từ `payments`):

```
cash_ledger(
  id, org_id, store_id, shift_id (nullable),
  direction check (in|out),
  category,                 -- 'thu_khac' | 'chi_khac' | 'hoan_tra' | 'thu_no' | ...
  amount (>0),
  ref_type, ref_id,         -- vd ('return', return_id)
  note, created_by, created_at
)
```

- `record_cash(p_store, p_direction, p_category, p_amount, p_note)` → phiếu thu/chi
  tay; tự gắn `shift_id = current_shift(store)` nếu có.
- Phiếu hoàn tiền của đổi/trả (mục C) ghi `cash_ledger(out, 'hoan_tra', ref return)`.

### C. Đổi/trả hàng — `return_orders` + `return_items`

Trả **theo từng dòng** (một phần đơn), tham chiếu đơn gốc đã `completed`.

```
return_orders(
  id, org_id, store_id, order_id, code 'TH…',
  subtotal,                 -- tổng tiền hàng trả lại
  refund_cash,              -- tiền mặt hoàn cho khách
  debt_reduced,             -- phần trừ vào công nợ KH (nếu đơn ghi nợ)
  reason, created_by, created_at
)
return_items(
  id, org_id, return_order_id, order_item_id, variant_id,
  qty (>0), price, total, restock (bool, default true)
)
```

`create_return(p_order, p_items jsonb[{order_item_id, qty, restock}], p_reason)`:

1. Kiểm đơn thuộc org, `status='completed'`. Mỗi dòng: `qty ≤` (đã bán − đã trả
   trước đó) để không trả vượt.
2. Với dòng `restock=true`: **cộng tồn** + ghi `stock_movements('in', ref 'return')`.
3. `refund_total = Σ total dòng trả`. Phân bổ:
   - Nếu đơn còn ghi nợ KH (`paid < total`): **giảm công nợ** trước
     `debt_reduced = min(refund_total, customer.debt)`.
   - Phần còn lại `refund_cash = refund_total − debt_reduced` → ghi
     `cash_ledger(out, 'hoan_tra')` gắn ca hiện tại.
4. Đơn gốc **giữ nguyên** (không sửa total) — trả là thực thể riêng để kiểm toán;
   báo cáo doanh thu trừ `return_orders.subtotal` (việc ở báo cáo, sau).

Quyền: owner/admin/store_manager/staff trong org đều trả được (như bán). Hoàn tồn
& hoàn tiền atomic trong một RPC.

## Phạm vi & route

- `/shifts` — ca hiện tại (mở/chốt) + lịch sử ca của chi nhánh active.
- `/cash` — sổ quỹ: danh sách phiếu thu/chi + nút tạo phiếu nhanh.
- Đổi/trả: nút **“Trả hàng”** ở `/orders/[id]` (đơn completed) → dialog chọn dòng &
  số lượng → tạo phiếu trả; danh sách phiếu trả ở `/orders` (lọc) hoặc trang đơn.
- Nav: nhóm **Bán hàng** thêm “Ca & Sổ quỹ”.

## Hệ quả

- Báo cáo doanh thu nên trừ hàng trả (ADR sau khi chạm `/reports`).
- Tiền bán mặt suy ra từ `payments` theo khung giờ ca: nếu sau này tách nhiều
  két/ca song song một chi nhánh thì phải gắn `shift_id` thẳng vào `payments`
  (đổi sau, có test).
- `create_sale` **không đổi** ở ADR này.
