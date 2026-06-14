// Gói cước & giới hạn — Phase 4 (lớp SaaS). null = không giới hạn.

export type PlanKey = "free" | "pro" | "business";
export type LimitKind = "products" | "stores" | "members";

export interface Plan {
  key: PlanKey;
  name: string;
  price: number; // đồng / tháng
  limits: Record<LimitKind, number | null>;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Miễn phí",
    price: 0,
    limits: { products: 30, stores: 1, members: 2 },
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: 199000,
    limits: { products: 1000, stores: 5, members: 10 },
  },
  business: {
    key: "business",
    name: "Doanh nghiệp",
    price: 499000,
    limits: { products: null, stores: null, members: null },
  },
};

export const PLAN_ORDER: PlanKey[] = ["free", "pro", "business"];

export const LIMIT_LABEL: Record<LimitKind, string> = {
  products: "sản phẩm",
  stores: "chi nhánh",
  members: "nhân viên",
};

export function getPlan(key: string | null | undefined): Plan {
  return PLANS[(key as PlanKey) ?? "free"] ?? PLANS.free;
}
