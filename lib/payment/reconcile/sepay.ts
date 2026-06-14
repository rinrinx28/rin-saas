// Adapter SePay — header "Authorization: Apikey <secret>"; payload giao dịch.
// ADR 0010. Chỉ xử lý tiền vào (transferType = "in").

import type { ReconcileProvider } from "./types";

interface SePayPayload {
  id?: number | string;
  referenceCode?: string;
  transferType?: string;
  transferAmount?: number;
  accountNumber?: string;
  content?: string;
  code?: string | null;
}

export const sepayProvider: ReconcileProvider = {
  key: "sepay",
  verify(apikeyHeader, secret) {
    if (!apikeyHeader || !secret) return false;
    return apikeyHeader.trim() === `Apikey ${secret}`;
  },
  parse(body) {
    const b = (body ?? {}) as SePayPayload;
    const externalId = b.id != null ? String(b.id) : b.referenceCode ? String(b.referenceCode) : "";
    if (!externalId) return null;
    if (b.transferType && b.transferType !== "in") return null; // chỉ tiền vào
    return {
      externalId,
      amount: Math.round(Number(b.transferAmount) || 0),
      account: b.accountNumber ?? null,
      content: `${b.content ?? ""} ${b.code ?? ""}`.trim(),
    };
  },
};
