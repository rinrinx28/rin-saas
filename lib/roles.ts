// Nhãn & cấp vai trò nhân sự. ADR 0011.

export type Role = "owner" | "admin" | "store_manager" | "staff";

export const ROLE_LABEL: Record<string, string> = {
  owner: "Chủ",
  admin: "Quản lý cửa hàng",
  store_manager: "Quản lý chi nhánh",
  staff: "Nhân viên",
};

// Vai trò gắn với một chi nhánh cụ thể.
export const STORE_SCOPED_ROLES = ["store_manager", "staff"];

export function isStoreScoped(role: string): boolean {
  return STORE_SCOPED_ROLES.includes(role);
}

export function roleBadge(role: string): "primary" | "info" | "success" | "neutral" {
  if (role === "owner") return "primary";
  if (role === "admin") return "info";
  if (role === "store_manager") return "success";
  return "neutral";
}
