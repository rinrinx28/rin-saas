import { z } from "zod";

export const purchaseItemSchema = z.object({
  variantId: z.string().uuid("Chọn sản phẩm"),
  qty: z.number({ error: "Nhập số" }).int("Số nguyên").min(1, "≥ 1"),
  cost: z.number({ error: "Nhập số" }).int("Số nguyên").min(0, "≥ 0"),
});

export const purchaseSchema = z.object({
  storeId: z.string().uuid("Chọn chi nhánh"),
  supplierId: z.string().optional(),
  note: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Cần ít nhất 1 dòng hàng"),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
