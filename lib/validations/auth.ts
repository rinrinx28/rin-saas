import { z } from "zod";

// Schema xác thực — thông báo lỗi tiếng Việt (ADR 0004: validation qua Zod)

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Tên tối thiểu 2 ký tự"),
    email: z.email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  orgName: z.string().min(2, "Tên cửa hàng tối thiểu 2 ký tự"),
  storeName: z.string().min(2, "Tên chi nhánh tối thiểu 2 ký tự"),
  storeAddress: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
