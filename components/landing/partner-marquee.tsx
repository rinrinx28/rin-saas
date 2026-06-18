import type { CSSProperties } from "react";

// Đối tác/tích hợp — chip nền tảng + logo ngân hàng (SVG thật trong public/banks).
// Hai hàng marquee chạy ngược chiều, fade hai mép. Chỉ trang trí.
interface Partner {
  name: string;
  tag: string;
  dot: string;
}

const PARTNERS: Partner[] = [
  { name: "VietQR", tag: "QR thu tiền", dot: "#1f6feb" },
  { name: "SePay", tag: "Đối soát tự động", dot: "#0ea5e9" },
  { name: "VNPay", tag: "Cổng thanh toán", dot: "#005baa" },
  { name: "MoMo", tag: "Ví điện tử", dot: "#a50064" },
  { name: "Viettel", tag: "Hóa đơn điện tử", dot: "#ee0033" },
  { name: "MISA", tag: "Hóa đơn điện tử", dot: "#e8442c" },
  { name: "VNPT", tag: "Hóa đơn điện tử", dot: "#0068b7" },
  { name: "Supabase", tag: "Hạ tầng realtime", dot: "#3ecf8e" },
];

const BANKS = [
  "VCB", "TCB", "BIDV", "MB", "VPB", "ACB", "TPB", "MSB",
  "VIB", "SHB", "OCB", "HDB", "VBA", "EIB", "LPB", "SEAB",
];

const FADE =
  "[mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]";

export function PartnerMarquee() {
  return (
    <section aria-label="Đối tác & tích hợp" className="border-y border-border bg-surface-2/30 py-12">
      <p data-reveal className="text-center text-sm font-medium text-fg-muted">
        Tích hợp sẵn với các nền tảng &amp; ngân hàng hàng đầu Việt Nam
      </p>

      {/* Hàng tích hợp */}
      <div className={`marquee group relative mt-6 overflow-hidden ${FADE}`}>
        <div className="marquee-track gap-3" style={{ "--marquee-duration": "34s" } as CSSProperties}>
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <span
              key={`${p.name}-${i}`}
              className="flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2 shadow-sm"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: p.dot }} />
              <span className="font-display text-sm font-semibold tracking-tight">{p.name}</span>
              <span className="text-[11px] text-fg-subtle">{p.tag}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hàng ngân hàng */}
      <div className={`marquee group relative mt-3 overflow-hidden ${FADE}`}>
        <div className="marquee-track gap-3" style={{ "--marquee-duration": "48s" } as CSSProperties}>
          {[...BANKS, ...BANKS].map((code, i) => (
            <span
              key={`${code}-${i}`}
              className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-2 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/banks/${code}.svg`}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                className="size-8 object-contain"
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
