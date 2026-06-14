// Sinh QR VietQR thuần (KHÔNG logo) qua qr.sepay.vn + chọn tài khoản hiệu lực.
// ADR 0009. QR phải dùng template "qronly" — không khung, không logo ngân hàng.

export interface BankInfo {
  name: string | null;
  account: string | null;
  holder: string | null;
}

// Tài khoản hiệu lực: chi nhánh ghi đè org (all-or-nothing theo account).
export function effectiveBank(
  org: BankInfo,
  store: BankInfo | null,
): BankInfo {
  if (store?.name && store.account) {
    return { name: store.name, account: store.account, holder: store.holder };
  }
  return org;
}

export function hasBank(bank: BankInfo): boolean {
  return Boolean(bank.name && bank.account);
}

// Nội dung chuyển khoản: ASCII không dấu để ngân hàng đọc đúng.
export function transferMemo(orderCode: string): string {
  return `TT ${orderCode}`.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").trim();
}

// URL ảnh QR thuần (qronly). Trả null nếu thiếu cấu hình tài khoản.
export function buildBankQrUrl(
  bank: BankInfo,
  amount: number,
  memo: string,
): string | null {
  if (!hasBank(bank)) return null;
  const params = new URLSearchParams({
    bank: bank.name!,
    acc: bank.account!,
    amount: String(Math.max(0, Math.round(amount))),
    des: memo,
    template: "qronly",
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}
