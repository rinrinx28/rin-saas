"use client";

import { useEffect, useState } from "react";

const CONFETTI_COLORS = [
  "oklch(68% 0.21 250)", // primary
  "oklch(72% 0.18 150)", // success
  "oklch(78% 0.16 75)", // warning
  "oklch(70% 0.2 20)", // đỏ
  "oklch(75% 0.15 320)", // hồng
];
const PIECES = 36;

interface Piece {
  id: number;
  cx: number;
  cy: number;
  cr: number;
  delay: number;
  color: string;
}

// Sinh pháo giấy (gọi trong timer, không phải lúc render → tránh lỗi purity).
function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 90;
    return {
      id: i,
      cx: Math.cos(angle) * dist,
      cy: Math.sin(angle) * dist + 30, // lệch xuống cho giống trọng lực
      cr: Math.random() * 540 - 270,
      delay: Math.random() * 0.12,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    };
  });
}

// Vẽ dấu tích rồi bắn pháo giấy khi nét vẽ hoàn tất.
export function SuccessCheck() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setPieces(makePieces()), 850);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative mx-auto grid size-20 place-items-center">
      <svg viewBox="0 0 52 52" className="size-20 text-success" aria-hidden>
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ strokeDasharray: 160, strokeDashoffset: 160 }}
          className="animate-[draw-stroke_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        />
        <path
          d="M15 27 l7.5 7.5 L37 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 40, strokeDashoffset: 40 }}
          className="animate-[draw-stroke_0.35s_0.45s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        />
      </svg>
      {pieces.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          {pieces.map((p) => (
            <span
              key={p.id}
              className="confetti-piece"
              style={
                {
                  backgroundColor: p.color,
                  animationDelay: `${p.delay}s`,
                  "--cx": `${p.cx}px`,
                  "--cy": `${p.cy}px`,
                  "--cr": `${p.cr}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
