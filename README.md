# rin-saas — Phần mềm quản lý bán hàng & kho (POS) đa chi nhánh

SaaS quản lý bán hàng, tồn kho, công nợ và hóa đơn cho cửa hàng/chuỗi cửa hàng SMB tại Việt Nam — đa tổ chức (multi-tenant), đa chi nhánh, thời gian thực.

> Hướng thiết kế: **Light luxury SaaS** — font Fraunces (display) + Be Vietnam Pro (UI/số), tokens oklch, light/dark. Mọi quyết định thiết kế ghi trong [`.claude/docs/`](.claude/docs/) dưới dạng ADR.

---

## Tính năng

### Bán hàng (POS)
- Màn POS toàn màn hình: lưới **sản phẩm gốc** (gứp biến thể), chọn biến thể bằng dialog, chip đổi biến thể trong giỏ.
- Tìm sản phẩm theo tên / barcode; tồn kho **cập nhật trực tiếp** (realtime) khi bán/nhập ở chi nhánh.
- Tạo/tìm nhanh khách hàng ngay tại quầy (theo tên hoặc số điện thoại).
- Phương thức: **Tiền mặt**, **Chuyển khoản (QR)**, VNPay/MoMo (adapter).
- Ô nhập tiền tự định dạng + gợi ý nhanh; chiết khấu; ghi nợ phần còn thiếu.
- Hiệu ứng "Thanh toán thành công" (vẽ dấu tích + pháo giấy), tự đóng.

### Thanh toán & QR
- Cấu hình **tài khoản nhận tiền** theo cửa hàng, cho phép **chi nhánh ghi đè**.
- Sinh **QR VietQR** (mã đơn + số tiền) để khách quét; danh sách 40+ ngân hàng VN có icon.
- In QR vào hóa đơn; xem QR ở chi tiết đơn.

### Đối soát chuyển khoản tự động
- Kết nối **SePay**: mỗi cửa hàng/chi nhánh một **webhook URL + secret** riêng.
- Tiền về tự **khớp đơn theo mã**, ghi nhận thanh toán & cập nhật công nợ — **idempotent**.
- **Sổ giao dịch** (kiểm toán): Đã khớp / Đơn đã đủ tiền / Chưa khớp / Trùng.
- POS thanh toán QR → **realtime tự xác nhận** khi nhận được tiền (hoặc xác nhận tay).

### Sản phẩm & kho
- Sản phẩm + nhiều **biến thể** (giá bán/giá vốn/barcode) + hình ảnh (Supabase Storage).
- Danh mục lồng cha–con.
- Tồn kho theo chi nhánh, **kiểm kho** (điều chỉnh về số thực đếm).
- Mọi thay đổi tồn đi qua RPC atomic + ghi `stock_movements`.

### Nhập hàng & nhà cung cấp
- Phiếu nhập kho (cộng tồn atomic), lọc theo NCC, phân trang.
- Công nợ **phải trả** NCC; thu/trả nợ.

### Khách hàng & công nợ
- Quản lý khách, công nợ **phải thu**; thu nợ.

### Hóa đơn & in
- Trang in hóa đơn nhiều khổ chuẩn: **K80 / K58 / A4** với khai báo `@page` để in khớp khổ máy in nhiệt.
- **Hóa đơn điện tử (HĐĐT)**: adapter provider (stub, sẵn sàng cắm Viettel/MISA/VNPT) — phát hành & lưu mã CQT / link tra cứu.

### Báo cáo & phân tích (realtime)
- KPI: doanh thu, số đơn, lãi gộp, biên lãi, giá trị tồn.
- Biểu đồ **doanh thu & lãi gộp theo ngày** (area + line), **donut** cơ cấu phương thức thanh toán.
- Xếp hạng: bán chạy (toggle Doanh thu/SL/Lãi), nhập nhiều, **khách hàng** & **nhà cung cấp** hàng đầu, % tỉ trọng.
- So sánh **Bán ra vs Nhập vào** theo sản phẩm (hàng bán nhanh / tồn đọng).
- Tự cập nhật khi có đơn/phiếu nhập mới.

### Nhân sự & phân quyền
- 4 vai trò: **Chủ**, **Quản lý cửa hàng**, **Quản lý chi nhánh**, **Nhân viên**; gán nhân viên vào chi nhánh.
- **Mời qua email** (kể cả khi chưa có tài khoản): người nhận đăng nhập → **Đồng ý / Từ chối**.
- Phân quyền RBAC ở tầng RPC (server-side).

### Đa tổ chức & gói cước
- Multi-tenant với **RLS** cô lập dữ liệu giữa các cửa hàng.
- Onboarding tạo cửa hàng + chi nhánh đầu tiên; chuyển đổi cửa hàng/chi nhánh.
- Gói **Miễn phí / Pro / Doanh nghiệp** + giới hạn (sản phẩm/chi nhánh/nhân viên); thanh toán qua chuyển khoản SePay.

---

## Công nghệ

| Lớp | Công nghệ |
| --- | --- |
| Frontend | Next.js 16 (App Router), React, TypeScript (strict) |
| UI | Tailwind CSS v4, Radix Dialog, recharts, GSAP, lucide-react |
| Backend | Supabase Cloud — Postgres, Auth, **RLS**, Realtime, Storage |
| Nghiệp vụ | RPC `security definer` atomic (bán/nhập/kho/đối soát/nhân sự) |
| Form/validate | React Hook Form + Zod |
| Test | Vitest (chạy thật trên cloud, tự dọn dữ liệu test) |

Nguyên tắc cốt lõi: **mọi mutation tiền/kho đi qua RPC atomic + RLS + RBAC**; mỗi tính năng có test thật trên cloud.

---

## Bắt đầu

Yêu cầu: Node 20+, pnpm, một project Supabase.

```bash
pnpm install

# Tạo .env.local từ mẫu rồi điền key Supabase + SePay
cp .env.example .env.local

# Đẩy migrations lên Supabase
set -a; . ./.env.local; set +a
echo y | npx supabase db push --db-url "$SUPABASE_DB_URL"

pnpm dev          # chạy dev (http://localhost:3000)
```

Lệnh khác:

```bash
pnpm build               # build production
pnpm lint                # ESLint
pnpm exec tsc --noEmit   # type-check
pnpm test                # Vitest (hit cloud thật — cần .env.local)
```

### Biến môi trường chính (`.env.local`)

| Biến | Mô tả |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server/webhook/test) |
| `SUPABASE_DB_URL` | Chuỗi kết nối Postgres (chạy migrations) |
| `SEPAY_WEBHOOK_API_KEY` | (tuỳ chọn) webhook gói cước |
| `EINVOICE_PROVIDER` | (tuỳ chọn) provider HĐĐT, mặc định `stub` |

---

## Cấu trúc dự án

```
app/                # App Router: (app) shell, (pos) POS, (print) in, api/webhooks
components/         # UI theo feature (pos, reports, settings, payment, ui, ...)
lib/                # supabase, payment (qr/reconcile/gateways), validations, nav, roles
supabase/migrations # Schema + RPC (đánh số tuần tự, RLS + security definer)
tests/              # Vitest chạy thật trên cloud
.claude/docs/       # ADR — nguồn chân lý quyết định thiết kế
```

---

## Quy ước phát triển

- **ADR-driven**: quyết định thiết kế duyệt → ghi `.claude/docs/` → mới code.
- File nhỏ, nhiều file; tiếng Việt cho UI & tài liệu; số dùng `tabular-nums`.
- Migrations bất biến (chỉ thêm mới, không sửa file đã push).
