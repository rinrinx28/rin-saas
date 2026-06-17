import { z } from "zod";

export const promotionSchema = z
  .object({
    name: z.string().min(1, "Nhập tên chương trình").max(80),
    code: z.string().trim().max(30).optional(),
    type: z.enum(["percent", "amount"]),
    value: z.number({ error: "Nhập số" }).int("Số nguyên").min(1, "≥ 1"),
    minOrder: z.number().int().min(0).default(0),
    maxDiscount: z.number().int().min(0).optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    active: z.boolean().default(true),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, {
    message: "Phần trăm phải ≤ 100",
    path: ["value"],
  });

export type PromotionInput = z.infer<typeof promotionSchema>;

export const PROMO_TYPE_LABEL: Record<string, string> = {
  percent: "Giảm %",
  amount: "Giảm tiền",
};
