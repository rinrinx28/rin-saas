// Registry provider HĐĐT — chọn qua env EINVOICE_PROVIDER (mặc định stub).
// Cắm Viettel/MISA/VNPT sau: thêm provider vào PROVIDERS. ADR 0008.

import { stubProvider } from "./stub";
import type { EInvoiceProvider } from "./types";

export * from "./types";

const PROVIDERS: Record<string, EInvoiceProvider> = {
  stub: stubProvider,
};

export function getEInvoiceProvider(): EInvoiceProvider {
  const key = process.env.EINVOICE_PROVIDER ?? "stub";
  return PROVIDERS[key] ?? stubProvider;
}
