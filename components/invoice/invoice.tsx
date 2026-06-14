"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { cn, formatVnd } from "@/lib/utils";

export interface InvoiceData {
  code: string;
  createdAt: string;
  orgName: string;
  storeName: string;
  storeAddress: string | null;
  customerName: string | null;
  method: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  qrUrl: string | null;
  qrMemo: string | null;
  items: { name: string; qty: number; price: number; total: number }[];
}

type Format = "k80" | "k58" | "a4";

// Khổ bill chuẩn cho bán hàng: máy in nhiệt K80/K58 + A4 (hóa đơn).
const FORMATS: Record<
  Format,
  { label: string; roll: string; sheet: string; base: string; title: string; head: string; qr: number; page: string }
> = {
  k80: {
    label: "K80 · 80mm",
    roll: "80mm",
    sheet: "w-[80mm] px-[4mm] py-[3mm]",
    base: "text-[12px] leading-tight",
    title: "text-base",
    head: "text-sm",
    qr: 150,
    page: "@page { size: 80mm auto; margin: 0; }",
  },
  k58: {
    label: "K58 · 58mm",
    roll: "58mm",
    sheet: "w-[58mm] px-[3mm] py-[2.5mm]",
    base: "text-[11px] leading-tight",
    title: "text-sm",
    head: "text-[13px]",
    qr: 118,
    page: "@page { size: 58mm auto; margin: 0; }",
  },
  a4: {
    label: "A4",
    roll: "A4",
    sheet: "w-[190mm] max-w-full p-10",
    base: "text-sm",
    title: "text-xl",
    head: "text-lg",
    qr: 200,
    page: "@page { size: A4; margin: 12mm; }",
  },
};

const FORMAT_KEYS = Object.keys(FORMATS) as Format[];

export function Invoice({ data }: { data: InvoiceData }) {
  const [format, setFormat] = useState<Format>("k80");
  const cfg = FORMATS[format];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      {/* Khai báo khổ giấy cho lệnh in → khớp đúng khổ máy in */}
      <style>{`${cfg.page} @media print { html, body { background: #fff !important; } }`}</style>

      {/* Thanh công cụ — ẩn khi in */}
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5">
          {FORMAT_KEYS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                format === f ? "bg-neutral-900 text-white" : "text-neutral-600",
              )}
            >
              {FORMATS[f].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          <Printer className="size-4" /> In
        </button>
      </div>

      {/* Hóa đơn */}
      <div className={cn("mx-auto bg-white text-black shadow-sm print:shadow-none", cfg.sheet, cfg.base)}>
        <div className="text-center">
          <p className={cn("font-semibold", cfg.title)}>{data.orgName}</p>
          {data.storeName && <p>{data.storeName}</p>}
          {data.storeAddress && <p className="text-neutral-600">{data.storeAddress}</p>}
          <p className={cn("mt-2 font-semibold uppercase", cfg.head)}>Hóa đơn bán hàng</p>
        </div>

        <div className="mt-3 flex flex-col gap-0.5 border-y border-dashed border-neutral-400 py-2">
          <Line label="Mã đơn" value={data.code} mono />
          <Line label="Thời gian" value={new Date(data.createdAt).toLocaleString("vi-VN")} />
          <Line label="Khách" value={data.customerName ?? "Khách lẻ"} />
        </div>

        <table className="mt-2 w-full">
          <thead>
            <tr className="border-b border-neutral-400 text-left">
              <th className="py-1 font-medium">Mặt hàng</th>
              <th className="py-1 text-right font-medium">SL</th>
              <th className="py-1 text-right font-medium">T.tiền</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} className="align-top">
                <td className="py-1 pr-1">{it.name}</td>
                <td className="py-1 text-right tabular-nums">{it.qty}</td>
                <td className="py-1 text-right tabular-nums">{formatVnd(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex flex-col gap-0.5 border-t border-dashed border-neutral-400 pt-2">
          <Line label="Tạm tính" value={formatVnd(data.subtotal)} mono />
          <Line label="Chiết khấu" value={formatVnd(data.discount)} mono />
          <div className="flex justify-between font-semibold">
            <span>TỔNG CỘNG</span>
            <span className="tabular-nums">{formatVnd(data.total)}</span>
          </div>
          <Line label={`Đã trả (${data.method})`} value={formatVnd(data.paid)} mono />
        </div>

        {data.qrUrl && (
          <div className="mt-3 flex flex-col items-center gap-1 border-t border-dashed border-neutral-400 pt-3">
            <p className="text-neutral-600">Quét QR để chuyển khoản</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qrUrl} alt="QR chuyển khoản" width={cfg.qr} height={cfg.qr} />
            {data.qrMemo && <p className="tabular-nums">ND: {data.qrMemo}</p>}
          </div>
        )}

        <p className="mt-4 text-center text-neutral-600">Cảm ơn quý khách!</p>
      </div>
    </div>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-600">{label}</span>
      <span className={mono ? "tabular-nums" : undefined}>{value}</span>
    </div>
  );
}
