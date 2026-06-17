import { z } from "zod";

export const returnItemSchema = z.object({
  orderItemId: z.string().uuid(),
  qty: z.number({ error: "Nhập số" }).int("Số nguyên").min(1, "≥ 1"),
  restock: z.boolean().default(true),
});

export const returnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().optional(),
  items: z.array(returnItemSchema).min(1, "Chọn ít nhất 1 dòng hàng trả"),
});

export type ReturnItemInput = z.infer<typeof returnItemSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
