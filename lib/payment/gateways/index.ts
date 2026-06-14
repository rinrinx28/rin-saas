// Registry cổng thanh toán — cắm VNPay/MoMo thật sau bằng cách thay provider.
// ADR 0009.

import { momoStub, vnpayStub } from "./stub";
import type { PaymentGateway } from "./types";

export * from "./types";

const GATEWAYS: Record<string, PaymentGateway> = {
  vnpay: vnpayStub,
  momo: momoStub,
};

export function getGateway(key: string): PaymentGateway | null {
  return GATEWAYS[key] ?? null;
}

export function listGateways(): PaymentGateway[] {
  return Object.values(GATEWAYS);
}
