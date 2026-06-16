import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Coins,
  CreditCard,
  Factory,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  TrendingUp,
  Truck,
  Users,
  UsersRound,
  Warehouse,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Mở ngoài app shell (vd POS fullscreen) */
  standalone?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

// Điều hướng — ADR 0005
export const navGroups: NavGroup[] = [
  {
    items: [{ label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Bán hàng",
    items: [
      { label: "Bán hàng (POS)", href: "/pos", icon: ShoppingCart, standalone: true },
      { label: "Đơn hàng", href: "/orders", icon: ReceiptText },
    ],
  },
  {
    label: "Hàng hóa",
    items: [
      { label: "Sản phẩm", href: "/products", icon: Package },
      { label: "Danh mục", href: "/categories", icon: Tags },
      { label: "Tồn kho", href: "/inventory", icon: Boxes },
      { label: "Nhập hàng", href: "/purchases", icon: Truck },
    ],
  },
  {
    label: "Đối tác",
    items: [
      { label: "Khách hàng", href: "/customers", icon: Users },
      { label: "Nhà cung cấp", href: "/suppliers", icon: Factory },
    ],
  },
  {
    label: "Báo cáo",
    items: [
      { label: "Doanh thu", href: "/reports", icon: TrendingUp },
      { label: "Tồn kho", href: "/reports/inventory", icon: Warehouse },
      { label: "Lãi/lỗ", href: "/reports/profit", icon: Coins },
    ],
  },
  {
    label: "Cài đặt",
    items: [
      { label: "Cửa hàng", href: "/settings", icon: Settings },
      { label: "Chi nhánh", href: "/settings/stores", icon: Store },
      { label: "Nhân viên", href: "/settings/members", icon: UsersRound },
      { label: "Đối soát", href: "/settings/reconciliation", icon: Landmark },
      { label: "Hóa đơn điện tử", href: "/settings/einvoice", icon: FileText },
      { label: "Gói cước", href: "/settings/billing", icon: CreditCard },
    ],
  },
];
