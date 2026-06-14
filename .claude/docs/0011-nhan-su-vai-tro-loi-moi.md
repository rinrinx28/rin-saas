# 0011 — Nhân sự: vai trò nhiều cấp, gán chi nhánh & lời mời

- **Trạng thái:** Accepted
- **Ngày:** 2026-06-14

## Vấn đề

Hệ thống cũ chỉ có 3 vai trò org-wide (owner/admin/staff), `add_member` bắt
buộc email đã có tài khoản và thêm thẳng (không hỏi). Cần:
- Vai trò nhiều cấp, có **quản lý chi nhánh** và **gán nhân viên vào chi nhánh**.
- **Mời trước bằng email** (kể cả khi chưa có tài khoản); khi người đó đăng
  ký/đăng nhập bằng email đó → hỏi **đồng ý / từ chối**.
- (Pha 2) **cô lập dữ liệu theo chi nhánh**.

## Quyết định

### Vai trò (giữ giá trị `admin` để không phải sửa hàng loạt check cũ)

| value | Nhãn | Phạm vi |
| --- | --- | --- |
| `owner` | Chủ | Toàn quyền |
| `admin` | Quản lý cửa hàng | Toàn bộ chi nhánh (org-wide) |
| `store_manager` | Quản lý chi nhánh | Một chi nhánh |
| `staff` | Nhân viên | Một chi nhánh |

`memberships.store_id`: null cho owner/admin; bắt buộc cho store_manager/staff.

### Lời mời (luôn qua lời mời, có quyền từ chối)

Bảng `member_invites` (org_id, email, role, store_id, status
pending/accepted/declined, invited_by). Thêm nhân viên = tạo **lời mời chờ**.
- owner/admin: mời mọi vai trò (admin/store_manager/staff), gán chi nhánh.
- store_manager: chỉ mời **staff** vào **chi nhánh của chính mình**.
- Khi người dùng đăng nhập, hệ thống tra lời mời theo email → hiện hộp thoại
  "Cửa hàng X mời bạn làm Y tại chi nhánh Z" → **Đồng ý** (tạo membership) /
  **Từ chối** (đánh dấu declined). Người nhận luôn có quyền từ chối.
- Mỗi org chỉ 1 lời mời pending / email (unique index một phần).

### Helper cho Pha 2

`can_access_store(p_store)` = true nếu là quản lý org (owner/admin) của
store đó, hoặc membership.store_id = store. Dùng để cô lập RLS ở Pha 2.

## Pha 2 (chưa làm)

Cô lập dữ liệu theo chi nhánh: RLS các bảng theo chi nhánh (inventory,
orders, purchases, stock_movements, stocktakes…) dùng `can_access_store`;
RPC mutation kiểm quyền theo store; báo cáo/dashboard/danh sách scope theo
chi nhánh truy cập được. Refactor lớn, làm riêng có test.

## Hệ quả

- Membership cũ (`admin`) giữ nguyên nghĩa "quản lý cửa hàng". Staff cũ có
  store_id null = xem toàn cửa hàng cho tới khi gán chi nhánh.
- `add_member` (thêm thẳng) thay bằng `invite_member` + accept/decline.
