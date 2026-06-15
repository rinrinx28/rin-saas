// Danh mục nhà cung cấp HĐĐT — dùng chung cho form cấu hình, validation và
// registry. Không phụ thuộc env (import được cả client lẫn server). ADR 0008.

export interface EInvoiceProviderMeta {
  key: string;
  name: string;
  /** Đã cài đặt adapter thật chưa. Chưa → chạy bằng stub. */
  implemented: boolean;
}

export const EINVOICE_PROVIDERS: EInvoiceProviderMeta[] = [
  { key: "stub", name: "Giả lập (test)", implemented: true },
  { key: "viettel", name: "Viettel S-Invoice", implemented: false },
  { key: "misa", name: "MISA meInvoice", implemented: false },
  { key: "vnpt", name: "VNPT", implemented: false },
];

export const EINVOICE_PROVIDER_KEYS = EINVOICE_PROVIDERS.map((p) => p.key);

export function getProviderMeta(key: string): EInvoiceProviderMeta | undefined {
  return EINVOICE_PROVIDERS.find((p) => p.key === key);
}
