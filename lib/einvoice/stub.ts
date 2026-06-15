// Provider stub — sinh số/ký hiệu/mã CQT + link tra cứu giả để chạy
// end-to-end khi chưa cắm nhà cung cấp thật. ADR 0008.

import type { EInvoiceConfig, EInvoiceOrder, EInvoiceProvider, IssueResult } from "./types";

const DEFAULT_SERIES = "1C26TYY"; // ký hiệu mẫu (mẫu số 1, ký hiệu C, năm 2026...)

// Mã CQT dạng chuỗi 34 ký tự hex; dẫn xuất xác định từ id đơn (ổn định) nhưng
// phân tán bằng xorshift để trông giống mã thật, không lặp pattern.
function deriveCode(seed: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  while (out.length < 34) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, 34).toUpperCase();
}

// Số HĐ dẫn xuất từ mã đơn (8 chữ số) — ổn định, không phụ thuộc thời gian.
function deriveNo(code: string): string {
  const digits = code.replace(/\D/g, "");
  return digits.slice(-8).padStart(8, "0");
}

export const stubProvider: EInvoiceProvider = {
  key: "stub",
  name: "HĐĐT (giả lập)",
  async issue(order: EInvoiceOrder, config: EInvoiceConfig | null): Promise<IssueResult> {
    const code = deriveCode(order.id);
    const invoiceNo = deriveNo(order.code);
    const series = config?.series?.trim() || DEFAULT_SERIES;
    return {
      status: "issued",
      series,
      invoiceNo,
      taxAuthorityCode: code,
      lookupUrl: `https://tra-cuu-hddt.example/lookup?code=${code}`,
      payload: {
        stub: true,
        order: order.code,
        total: order.total,
        invoiceType: config?.invoiceType ?? "sales",
        taxRate: config?.taxRate ?? 10,
        sellerTaxCode: config?.sellerTaxCode ?? null,
        sellerName: config?.sellerName ?? null,
        sellerAddress: config?.sellerAddress ?? null,
      },
    };
  },
};
