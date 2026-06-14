import { z } from "zod";

export const addMemberSchema = z.object({
  email: z.email("Email không hợp lệ"),
  role: z.enum(["admin", "staff"]),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
