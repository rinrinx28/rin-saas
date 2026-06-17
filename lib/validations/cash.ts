import { z } from "zod";

// Phiếu thu/chi tiền mặt (sổ quỹ).
export const recordCashSchema = z.object({
  storeId: z.string().uuid("Chọn chi nhánh"),
  direction: z.enum(["in", "out"]),
  category: z.string().min(1).max(40).default("khac"),
  amount: z.number({ error: "Nhập số" }).int("Số nguyên").min(1, "≥ 1"),
  note: z.string().optional(),
});

export type RecordCashInput = z.infer<typeof recordCashSchema>;

// Nhãn nhóm phiếu quỹ (gợi ý nhanh trong UI).
export const CASH_CATEGORY_LABEL: Record<string, string> = {
  khac: "Khác",
  thu_khac: "Thu khác",
  chi_khac: "Chi khác",
  von: "Góp vốn",
  rut: "Rút quỹ",
  luong: "Ứng/Trả lương",
  dien_nuoc: "Điện nước",
  hoan_tra: "Hoàn tiền trả hàng",
  thu_no: "Thu nợ",
};
