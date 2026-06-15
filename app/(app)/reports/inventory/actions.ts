"use server";

import { DEFAULT_DEAD_DAYS, DEFAULT_THRESHOLD } from "@/app/(app)/reports/inventory/constants";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export interface InventorySummary {
  sku_count: number;
  out_of_stock: number;
  total_qty: number;
  cost_value: number;
  retail_value: number;
}
export interface CategoryValue {
  name: string;
  qty: number;
  cost_value: number;
  retail_value: number;
}
export interface LowStockItem {
  name: string;
  store: string;
  qty: number;
  price: number;
}
export interface DeadStockItem {
  name: string;
  qty: number;
  cost_value: number;
  last_sold: string | null;
}
export interface InventoryReport {
  summary: InventorySummary;
  byCategory: CategoryValue[];
  lowStock: LowStockItem[];
  deadStock: DeadStockItem[];
}

const EMPTY: InventoryReport = {
  summary: { sku_count: 0, out_of_stock: 0, total_qty: 0, cost_value: 0, retail_value: 0 },
  byCategory: [],
  lowStock: [],
  deadStock: [],
};

const LIMIT = 20;

/** Ngưỡng hợp lệ: 0–999 cái; số ngày tồn đọng: 7/30/60/90. */
function safeThreshold(n: number): number {
  return Number.isFinite(n) && n >= 0 && n <= 999 ? Math.floor(n) : DEFAULT_THRESHOLD;
}
function safeDeadDays(n: number): number {
  return [7, 30, 60, 90].includes(n) ? n : DEFAULT_DEAD_DAYS;
}

export async function fetchInventoryReport(threshold: number, deadDays: number): Promise<InventoryReport> {
  const orgId = await getActiveOrgId();
  if (!orgId) return EMPTY;

  const p_threshold = safeThreshold(threshold);
  const p_days = safeDeadDays(deadDays);

  const supabase = await createClient();
  const [sum, cats, low, dead] = await Promise.all([
    supabase.rpc("report_inventory_summary", { p_org: orgId }),
    supabase.rpc("report_inventory_by_category", { p_org: orgId }),
    supabase.rpc("report_low_stock", { p_org: orgId, p_threshold, p_limit: LIMIT }),
    supabase.rpc("report_dead_stock", { p_org: orgId, p_days, p_limit: LIMIT }),
  ]);

  return {
    summary: (sum.data as InventorySummary) ?? EMPTY.summary,
    byCategory: (cats.data as CategoryValue[]) ?? [],
    lowStock: (low.data as LowStockItem[]) ?? [],
    deadStock: (dead.data as DeadStockItem[]) ?? [],
  };
}
