import { z } from "zod";

export const inviteMemberSchema = z
  .object({
    email: z.email("Email không hợp lệ"),
    role: z.enum(["admin", "store_manager", "staff"]),
    storeId: z.string().uuid().optional(),
  })
  .refine((v) => v.role === "admin" || !!v.storeId, {
    message: "Cần chọn chi nhánh",
    path: ["storeId"],
  });

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
