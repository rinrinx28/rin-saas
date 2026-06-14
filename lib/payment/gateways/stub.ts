// Provider stub cho VNPay/MoMo — chưa tích hợp cổng thật (cần credentials
// merchant). Trả trạng thái "stub" để UI báo cần cấu hình. ADR 0009.

import type { ChargeResult, PaymentGateway } from "./types";

function makeStub(key: string, name: string): PaymentGateway {
  return {
    key,
    name,
    configured: false,
    async createCharge(): Promise<ChargeResult> {
      return {
        status: "stub",
        note: `Cổng ${name} chưa được cấu hình merchant. Đang ở chế độ adapter.`,
      };
    },
  };
}

export const vnpayStub = makeStub("vnpay", "VNPay");
export const momoStub = makeStub("momo", "MoMo");
