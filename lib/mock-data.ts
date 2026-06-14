// TẠM THỜI — dữ liệu giả cho app shell khi chưa gắn Supabase.
// Sẽ thay bằng truy vấn server (org/store theo session + RLS) ở Phase 1 backend.

export interface MockOrg {
  id: string;
  name: string;
}

export interface MockStore {
  id: string;
  name: string;
}

export interface MockUser {
  name: string;
  email: string;
}

export const mockOrgs: MockOrg[] = [
  { id: "org-1", name: "Cửa hàng Thời trang ABC" },
  { id: "org-2", name: "Tạp hóa Nhà Rin" },
];

export const mockStores: MockStore[] = [
  { id: "store-1", name: "Chi nhánh Quận 1" },
  { id: "store-2", name: "Chi nhánh Thủ Đức" },
];

export const mockUser: MockUser = {
  name: "Rin Nguyễn",
  email: "dbng165@gmail.com",
};

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
