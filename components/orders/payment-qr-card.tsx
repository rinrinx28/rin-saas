import { QrCode } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { type BankInfo, buildBankQrUrl, hasBank, transferMemo } from "@/lib/payment/bank-qr";
import { formatVnd } from "@/lib/utils";

// Card QR chuyển khoản cho một đơn (trang chi tiết). Không hiện nếu chưa cấu hình TK.
export function PaymentQrCard({
  bank,
  amount,
  orderCode,
}: {
  bank: BankInfo;
  amount: number;
  orderCode: string;
}) {
  if (!hasBank(bank)) return null;
  const memo = transferMemo(orderCode);
  const qrUrl = buildBankQrUrl(bank, amount, memo);
  if (!qrUrl) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-5 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <QrCode className="size-4 text-fg-muted" /> QR chuyển khoản
        </span>
        <div className="flex flex-col items-center gap-2 border-t border-border pt-3">
          <Image src={qrUrl} alt="QR chuyển khoản" width={180} height={180} className="rounded-md" unoptimized />
          <div className="w-full space-y-1 text-center text-xs text-fg-muted">
            <p>
              {bank.name} · <span className="tnum">{bank.account}</span>
            </p>
            {bank.holder && <p>{bank.holder}</p>}
            <p>
              Số tiền: <span className="tnum font-medium text-fg">{formatVnd(amount)}</span>
            </p>
            <p>
              Nội dung: <span className="font-medium text-fg">{memo}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
