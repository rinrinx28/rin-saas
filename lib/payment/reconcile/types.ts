// Hợp đồng adapter đối soát — chuẩn hoá payload webhook từng provider. ADR 0010.

export interface NormalizedTxn {
  externalId: string; // id giao dịch (idempotency)
  amount: number;
  account: string | null; // số tài khoản nhận
  content: string; // nội dung CK (để dò mã đơn)
}

export interface ReconcileProvider {
  readonly key: string;
  // Xác thực request webhook bằng secret riêng của tenant.
  verify(apikeyHeader: string | null, secret: string): boolean;
  // Chuẩn hoá payload; trả null nếu nên bỏ qua (không phải tiền vào / payload lạ).
  parse(body: unknown): NormalizedTxn | null;
}
