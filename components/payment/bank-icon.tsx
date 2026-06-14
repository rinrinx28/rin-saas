import { BANK_ICON_CODES } from "@/lib/payment/bank-icon-codes";
import type { VnBank } from "@/lib/payment/vn-banks";
import { cn } from "@/lib/utils";

// Icon ngân hàng: ưu tiên icon app SVG thật (public/banks/<CODE>.svg);
// ngân hàng chưa có icon → fallback chip màu riêng + mã. ADR 0009.

const SIZES = {
  sm: "size-6 text-[9px]",
  md: "size-8 text-[10px]",
  lg: "size-11 text-xs",
} as const;

const PX = { sm: 24, md: 32, lg: 44 } as const;

// Hue ổn định theo code → mỗi ngân hàng một màu chip riêng (khi chưa có icon).
function hueFromCode(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 360;
  return h;
}

export function BankIcon({
  bank,
  size = "md",
  className,
}: {
  bank: VnBank;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (BANK_ICON_CODES.has(bank.code)) {
    const px = PX[size];
    // App icon đã có sẵn nền + bo góc chuẩn trong SVG → render nguyên bản, không bọc thêm.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/banks/${bank.code}.svg`}
        alt={bank.shortName}
        width={px}
        height={px}
        className={cn("shrink-0 object-contain", SIZES[size], className)}
      />
    );
  }

  const hue = hueFromCode(bank.code);
  return (
    <span
      aria-hidden
      title={bank.shortName}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold leading-none text-white",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: `oklch(58% 0.14 ${hue})` }}
    >
      {bank.code}
    </span>
  );
}
