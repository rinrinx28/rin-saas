import { z } from "zod";

// Mệnh giá tiền VND (đếm quỹ cuối ca).
export const CASH_DENOMINATIONS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000] as const;

export type OpeningMode = "carry" | "fixed" | "manual";

export const OPENING_MODE_LABEL: Record<OpeningMode, string> = {
  carry: "Cuốn chiếu từ ca trước",
  fixed: "Định mức cố định",
  manual: "Nhập tay mỗi ca",
};

// Mở ca: chọn định nghĩa ca (tuỳ chọn) + tiền đầu ca (chỉ dùng khi chế độ nhập tay).
export const openShiftSchema = z.object({
  storeId: z.string().uuid("Chọn chi nhánh"),
  definitionId: z.string().uuid().optional(),
  openingCash: z.number({ error: "Nhập số" }).int("Số nguyên").min(0, "≥ 0").default(0),
  note: z.string().optional(),
});

// Chốt ca: tổng đếm tay HOẶC bảng mệnh giá (server tự cộng nếu có breakdown).
export const closeShiftSchema = z.object({
  shiftId: z.string().uuid(),
  counted: z.number({ error: "Nhập số" }).int("Số nguyên").min(0, "≥ 0").default(0),
  breakdown: z.record(z.string(), z.number().int().min(0)).optional(),
  note: z.string().optional(),
});

// Cấu hình tiền đầu ca (cấp tổ chức).
export const shiftConfigSchema = z.object({
  openingMode: z.enum(["carry", "fixed", "manual"]),
  fixedFloat: z.number().int().min(0).default(0),
});

// Định nghĩa ca (mẫu ca). scope: 'org' = mặc định cửa hàng, 'store' = bộ riêng chi nhánh.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const shiftDefinitionSchema = z.object({
  scope: z.enum(["org", "store"]),
  name: z.string().min(1, "Nhập tên ca").max(40),
  startTime: z.string().regex(TIME_RE, "HH:MM").optional().or(z.literal("")),
  endTime: z.string().regex(TIME_RE, "HH:MM").optional().or(z.literal("")),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type ShiftConfigInput = z.infer<typeof shiftConfigSchema>;
export type ShiftDefinitionInput = z.infer<typeof shiftDefinitionSchema>;
