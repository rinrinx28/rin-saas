import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhà cung cấp"),
  phone: z.string().optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
