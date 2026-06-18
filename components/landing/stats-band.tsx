"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Stat {
  label: string;
  target: number;
  format: (v: number) => string;
}

const STATS: Stat[] = [
  { label: "Cửa hàng tin dùng", target: 1200, format: (v) => `${Math.round(v).toLocaleString("vi-VN")}+` },
  { label: "Đơn đã xử lý", target: 4.2, format: (v) => `${v.toFixed(1).replace(".", ",")}tr+` },
  { label: "Ngân hàng hỗ trợ", target: 40, format: (v) => `${Math.round(v)}+` },
  { label: "Thời gian hoạt động", target: 99.9, format: (v) => `${v.toFixed(1).replace(".", ",")}%` },
];

export function StatsBand() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const els = gsap.utils.toArray<HTMLElement>("[data-stat]", root.current);
      els.forEach((el) => {
        const idx = Number(el.dataset.idx);
        const stat = STATS[idx];
        const obj = { v: 0 };
        el.textContent = stat.format(0);
        gsap.to(obj, {
          v: stat.target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => {
            el.textContent = stat.format(obj.v);
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mx-auto max-w-6xl px-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={s.label} className="bg-surface px-6 py-7 text-center">
            <dd
              data-stat
              data-idx={i}
              className="tnum font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl"
            >
              {s.format(s.target)}
            </dd>
            <dt className="mt-1.5 text-sm text-fg-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
