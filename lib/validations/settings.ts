import { z } from "zod";

export const orgSchema = z.object({
  name: z.string().min(2, "Tên cửa hàng tối thiểu 2 ký tự"),
});

// Trường tài khoản nhận tiền (chuyển khoản) — dùng chung cho org & chi nhánh.
export const bankSchema = z.object({
  bankName: z.string().trim().max(50).optional(),
  bankAccount: z
    .string()
    .trim()
    .max(30)
    .regex(/^\d*$/, "Số tài khoản chỉ gồm chữ số")
    .optional(),
  bankHolder: z.string().trim().max(100).optional(),
});

export const storeSchema = z
  .object({
    name: z.string().min(2, "Tên chi nhánh tối thiểu 2 ký tự"),
    address: z.string().optional(),
  })
  .merge(bankSchema);

export type OrgInput = z.infer<typeof orgSchema>;
export type BankInput = z.infer<typeof bankSchema>;
export type StoreInput = z.infer<typeof storeSchema>;
