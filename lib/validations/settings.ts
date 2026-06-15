import { z } from "zod";
import { EINVOICE_PROVIDER_KEYS } from "@/lib/einvoice/providers";

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
    .regex(/^[A-Za-z0-9]*$/, "Số tài khoản chỉ gồm chữ và số")
    .optional(),
  bankHolder: z.string().trim().max(100).optional(),
});

export const storeSchema = z
  .object({
    name: z.string().min(2, "Tên chi nhánh tối thiểu 2 ký tự"),
    address: z.string().optional(),
  })
  .merge(bankSchema);

// Cấu hình HĐĐT per-tenant (ADR 0008). Các trường thông tin/credentials optional.
export const einvoiceConfigSchema = z.object({
  provider: z.enum(EINVOICE_PROVIDER_KEYS as [string, ...string[]]),
  enabled: z.boolean(),
  sellerTaxCode: z
    .string()
    .trim()
    .max(14)
    .regex(/^[0-9-]*$/, "MST chỉ gồm số và dấu gạch")
    .optional(),
  sellerName: z.string().trim().max(150).optional(),
  sellerAddress: z.string().trim().max(255).optional(),
  templateNo: z.string().trim().max(10).optional(),
  series: z.string().trim().max(20).optional(),
  apiEndpoint: z.string().trim().max(255).optional(),
  apiUsername: z.string().trim().max(100).optional(),
  apiSecret: z.string().trim().max(255).optional(),
});

export type OrgInput = z.infer<typeof orgSchema>;
export type BankInput = z.infer<typeof bankSchema>;
export type StoreInput = z.infer<typeof storeSchema>;
export type EInvoiceConfigInput = z.infer<typeof einvoiceConfigSchema>;
