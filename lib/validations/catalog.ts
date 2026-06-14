import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên danh mục"),
  // "" (không chọn) → chuyển thành null ở action
  parentId: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nhập tên biến thể"),
  barcode: z.string().optional(),
  price: z.number({ error: "Nhập số" }).int("Số nguyên").min(0, "≥ 0"),
  cost: z.number({ error: "Nhập số" }).int("Số nguyên").min(0, "≥ 0"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên sản phẩm"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
  variants: z.array(variantSchema).min(1, "Cần ít nhất 1 biến thể"),
});

export type VariantInput = z.infer<typeof variantSchema>;
export type ProductInput = z.infer<typeof productSchema>;
