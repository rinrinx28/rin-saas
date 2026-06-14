// Hợp đồng adapter cổng thanh toán (VNPay/MoMo…). ADR 0009.
// Provider thật cài đặt interface này; mặc định dùng stub.

export interface ChargeRequest {
  amount: number;
  orderCode: string;
  memo: string;
  returnUrl?: string;
}

export interface ChargeResult {
  status: "pending" | "stub" | "failed";
  payUrl?: string; // URL redirect tới cổng (provider thật)
  qrUrl?: string; // QR thuần nếu cổng hỗ trợ
  note?: string; // ghi chú cho UI (vd cần cấu hình merchant)
  error?: string;
}

export interface PaymentGateway {
  readonly key: string;
  readonly name: string;
  readonly configured: boolean;
  createCharge(req: ChargeRequest): Promise<ChargeResult>;
}
