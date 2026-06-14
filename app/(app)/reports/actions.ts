"use server";

import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export interface DailyPoint {
  day: string;
  revenue: number;
  orders: number;
  profit: number;
}
export interface RankItem {
  name: string;
  qty?: number;
  revenue?: number;
  value?: number;
  orders?: number;
  profit?: number;
}
export interface SalesVsPurchase {
  name: string;
  sold: number;
  purchased: number;
}
export interface PaymentSlice {
  method: string;
  count: number;
  amount: number;
}
export interface ReportData {
  summary: { revenue: number; orders: number; cogs: number };
  daily: DailyPoint[];
  topProducts: RankItem[];
  topPurchased: RankItem[];
  topCustomers: RankItem[];
  topSuppliers: RankItem[];
  payments: PaymentSlice[];
  salesVsPurchases: SalesVsPurchase[];
  inventory: { cost: number; retail: number };
}

const EMPTY: ReportData = {
  summary: { revenue: 0, orders: 0, cogs: 0 },
  daily: [],
  topProducts: [],
  topPurchased: [],
  topCustomers: [],
  topSuppliers: [],
  payments: [],
  salesVsPurchases: [],
  inventory: { cost: 0, retail: 0 },
};

const LIMIT = 8;

interface InvRow {
  qty: number;
  product_variants: { cost: number; price: number } | null;
}

export async function fetchReportData(days: number): Promise<ReportData> {
  const orgId = await getActiveOrgId();
  if (!orgId) return EMPTY;

  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const to = new Date();
  const from = new Date(to.getTime() - safeDays * 86400000);
  const p = { p_org: orgId, p_from: from.toISOString(), p_to: to.toISOString() };

  const supabase = await createClient();
  const [sum, daily, prods, purch, custs, sups, pays, svp, inv] = await Promise.all([
    supabase.rpc("report_summary", p),
    supabase.rpc("report_daily_revenue", p),
    supabase.rpc("top_products", { ...p, p_limit: LIMIT }),
    supabase.rpc("top_purchased_products", { ...p, p_limit: LIMIT }),
    supabase.rpc("top_customers", { ...p, p_limit: LIMIT }),
    supabase.rpc("top_suppliers", { ...p, p_limit: LIMIT }),
    supabase.rpc("payment_method_breakdown", p),
    supabase.rpc("product_sales_vs_purchases", { ...p, p_limit: LIMIT }),
    supabase.from("inventory").select("qty, product_variants(cost, price)").eq("org_id", orgId),
  ]);

  const invRows = (inv.data as InvRow[] | null) ?? [];
  const inventory = {
    cost: invRows.reduce((s, r) => s + r.qty * (r.product_variants?.cost ?? 0), 0),
    retail: invRows.reduce((s, r) => s + r.qty * (r.product_variants?.price ?? 0), 0),
  };

  return {
    summary: (sum.data as ReportData["summary"]) ?? EMPTY.summary,
    daily: (daily.data as DailyPoint[]) ?? [],
    topProducts: (prods.data as RankItem[]) ?? [],
    topPurchased: (purch.data as RankItem[]) ?? [],
    topCustomers: (custs.data as RankItem[]) ?? [],
    topSuppliers: (sups.data as RankItem[]) ?? [],
    payments: (pays.data as PaymentSlice[]) ?? [],
    salesVsPurchases: (svp.data as SalesVsPurchase[]) ?? [],
    inventory,
  };
}
