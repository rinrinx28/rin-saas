// Registry provider HĐĐT — chọn theo key từ cấu hình per-tenant
// (einvoice_config.provider). Provider chưa cài đặt → fallback stub. ADR 0008.

import { stubProvider } from "./stub";
import type { EInvoiceProvider } from "./types";

export * from "./types";
export * from "./providers";

const PROVIDERS: Record<string, EInvoiceProvider> = {
  stub: stubProvider,
  // viettel / misa / vnpt: thêm khi có hợp đồng + chứng thư số.
};

export function getEInvoiceProvider(key?: string | null): EInvoiceProvider {
  if (key && PROVIDERS[key]) return PROVIDERS[key];
  return stubProvider;
}
