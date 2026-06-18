import type { CSSProperties } from "react";

// Đối tác/tích hợp — logo nền tảng (SVG chính thức, self-host trong public/partners)
// + logo ngân hàng (public/banks). Hai hàng marquee, fade hai mép. Chỉ trang trí.
const PARTNERS = [
  { file: "vietqr", name: "VietQR" },
  { file: "sepay", name: "SePay" },
  { file: "vnpay", name: "VNPAY" },
  { file: "momo", name: "MoMo" },
  { file: "viettel", name: "Viettel" },
  { file: "misa", name: "MISA" },
  { file: "supabase", name: "Supabase" },
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

      {/* Hàng nền tảng */}
      <div className={`marquee group relative mt-6 overflow-hidden ${FADE}`}>
        <div className="marquee-track gap-3" style={{ "--marquee-duration": "34s" } as CSSProperties}>
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <span
              key={`${p.file}-${i}`}
              className="flex h-14 shrink-0 items-center rounded-xl border border-border bg-white px-5 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/partners/${p.file}.svg`}
                alt={p.name}
                height={28}
                loading="lazy"
                className="h-7 w-auto object-contain"
              />
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
