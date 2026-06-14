import type { VnBank } from "@/lib/payment/vn-banks";
import { cn } from "@/lib/utils";

// Icon vuông cho ngân hàng: chip màu riêng (suy ra ổn định từ code) + mã ngân hàng.
// Dùng thay logo chữ ngang (xấu khi thu nhỏ) — đồng nhất, không phụ thuộc mạng.

const SIZES = {
  sm: "size-6 text-[9px]",
  md: "size-8 text-[10px]",
  lg: "size-11 text-xs",
} as const;

// Hue ổn định theo code → mỗi ngân hàng một màu riêng.
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
