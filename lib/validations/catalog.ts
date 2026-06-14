import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên danh mục"),
  // "" (không chọn) → chuyển thành null ở action
  parentId: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
