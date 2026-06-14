import { z } from "zod";

export const saleItemSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1),
  price: z.number().int().min(0),
});

export const saleSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().optional(),
  discount: z.number().int().min(0),
  method: z.enum(["cash", "transfer", "vnpay", "momo"]),
  paid: z.number().int().min(0),
  items: z.array(saleItemSchema).min(1, "Giỏ hàng trống"),
});

// Đơn chờ chuyển khoản (chưa thu tiền) — sinh trước khi hiện QR.
export const transferOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().optional(),
  discount: z.number().int().min(0),
  items: z.array(saleItemSchema).min(1, "Giỏ hàng trống"),
});

export type SaleInput = z.infer<typeof saleSchema>;
export type TransferOrderInput = z.infer<typeof transferOrderSchema>;
