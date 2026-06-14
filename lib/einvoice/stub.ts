// Provider stub — sinh số/ký hiệu/mã CQT + link tra cứu giả để chạy
// end-to-end khi chưa cắm nhà cung cấp thật. ADR 0008.

import type { EInvoiceOrder, EInvoiceProvider, IssueResult } from "./types";

const SERIES = "1C26TYY"; // ký hiệu mẫu (mẫu số 1, ký hiệu C, năm 2026...)

// Mã CQT dạng chuỗi 30+ ký tự hex; ở đây dẫn xuất xác định từ id đơn để ổn định.
function deriveCode(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `00${hex}${hex}${hex}${hex}`.slice(0, 34).toUpperCase();
}

// Số HĐ dẫn xuất từ mã đơn (8 chữ số) — ổn định, không phụ thuộc thời gian.
function deriveNo(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.slice(-8).padStart(8, "0");
}

export const stubProvider: EInvoiceProvider = {
  key: "stub",
  name: "HĐĐT (giả lập)",
  async issue(order: EInvoiceOrder): Promise<IssueResult> {
    const code = deriveCode(order.id);
    const invoiceNo = deriveNo(order.code);
    return {
      status: "issued",
      series: SERIES,
      invoiceNo,
      taxAuthorityCode: code,
      lookupUrl: `https://tra-cuu-hddt.example/lookup?code=${code}`,
      payload: { stub: true, order: order.code, total: order.total },
    };
  },
};
