"use client";

import { useState } from "react";
import { BANK_ICON_CODES } from "@/lib/payment/bank-icon-codes";
import type { VnBank } from "@/lib/payment/vn-banks";
import { cn } from "@/lib/utils";

// Icon ngân hàng, ưu tiên giảm dần:
// 1) App icon SVG thật (public/banks/<CODE>.svg) — render nguyên bản (đã có nền + bo góc).
// 2) Logo VietQR (cdn.vietqr.io) trên ô nền trắng — cho bank chưa có app icon.
// 3) Chip màu + mã — khi cả hai ảnh lỗi. ADR 0009.

const SIZES = {
  sm: "size-6 text-[9px]",
  md: "size-8 text-[10px]",
  lg: "size-11 text-xs",
} as const;

const PX = { sm: 24, md: 32, lg: 44 } as const;

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
  const [svgFailed, setSvgFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const px = PX[size];

  // 1) App icon SVG thật — render nguyên bản (giữ nền + bo góc của design).
  if (BANK_ICON_CODES.has(bank.code) && !svgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/banks/${bank.code}.svg`}
        alt={bank.shortName}
        width={px}
        height={px}
        onError={() => setSvgFailed(true)}
        className={cn("shrink-0 object-contain", SIZES[size], className)}
      />
    );
  }

  // 2) Logo VietQR (chữ ngang, nền trong suốt) → đặt trên ô nền trắng cho rõ.
  if (bank.logo && !logoFailed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white",
          SIZES[size],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bank.logo}
          alt={bank.shortName}
          width={px}
          height={px}
          onError={() => setLogoFailed(true)}
          className="size-full object-contain p-0.5"
        />
      </span>
    );
  }

  // 3) Chip màu + mã ngân hàng.
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
