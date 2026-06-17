import { z } from "zod";

export const loyaltyConfigSchema = z.object({
  enabled: z.boolean(),
  earnPerK: z.number({ error: "Nhập số" }).int("Số nguyên").min(0).max(1000),
  redeemValue: z.number({ error: "Nhập số" }).int("Số nguyên").min(1, "≥ 1"),
  minRedeem: z.number().int().min(0).default(0),
});

export type LoyaltyConfigInput = z.infer<typeof loyaltyConfigSchema>;

export interface LoyaltyConfig {
  enabled: boolean;
  earnPerK: number;
  redeemValue: number;
  minRedeem: number;
}

// Quy đổi điểm → tiền (mirror logic create_sale) để POS hiện tổng đúng trước khi thu.
export function redeemPreview(
  cfg: LoyaltyConfig,
  customerPoints: number,
  requestedPoints: number,
  preLoyaltyTotal: number,
): { points: number; value: number } {
  if (!cfg.enabled || cfg.redeemValue <= 0 || requestedPoints <= 0) return { points: 0, value: 0 };
  const maxByValue = Math.floor(preLoyaltyTotal / cfg.redeemValue);
  const points = Math.min(requestedPoints, customerPoints, maxByValue);
  if (points <= 0 || points < cfg.minRedeem) return { points: 0, value: 0 };
  return { points, value: points * cfg.redeemValue };
}
