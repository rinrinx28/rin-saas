"use server";

import type { DailyPoint, RankItem } from "@/app/(app)/reports/actions";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export interface CategoryProfit {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
}
export interface ProfitReport {
  summary: { revenue: number; orders: number; cogs: number };
  daily: DailyPoint[];
  byProduct: RankItem[];
  byCategory: CategoryProfit[];
}

const EMPTY: ProfitReport = {
  summary: { revenue: 0, orders: 0, cogs: 0 },
  daily: [],
  byProduct: [],
  byCategory: [],
};

const LIMIT = 8;

export async function fetchProfitReport(days: number): Promise<ProfitReport> {
  const orgId = await getActiveOrgId();
  if (!orgId) return EMPTY;

  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const to = new Date();
  const from = new Date(to.getTime() - safeDays * 86400000);
  const p = { p_org: orgId, p_from: from.toISOString(), p_to: to.toISOString() };

  const supabase = await createClient();
  const [sum, daily, prods, cats] = await Promise.all([
    supabase.rpc("report_summary", p),
    supabase.rpc("report_daily_revenue", p),
    supabase.rpc("top_products", { ...p, p_limit: LIMIT }),
    supabase.rpc("report_profit_by_category", { ...p, p_limit: LIMIT }),
  ]);

  return {
    summary: (sum.data as ProfitReport["summary"]) ?? EMPTY.summary,
    daily: (daily.data as DailyPoint[]) ?? [],
    byProduct: (prods.data as RankItem[]) ?? [],
    byCategory: (cats.data as CategoryProfit[]) ?? [],
  };
}
