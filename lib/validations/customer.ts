import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên khách hàng"),
  phone: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
