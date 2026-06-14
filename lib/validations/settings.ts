import { z } from "zod";

export const orgSchema = z.object({
  name: z.string().min(2, "Tên cửa hàng tối thiểu 2 ký tự"),
});

export const storeSchema = z.object({
  name: z.string().min(2, "Tên chi nhánh tối thiểu 2 ký tự"),
  address: z.string().optional(),
});

export type OrgInput = z.infer<typeof orgSchema>;
export type StoreInput = z.infer<typeof storeSchema>;
