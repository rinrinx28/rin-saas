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
  items: { name: string; qty: number; price: number; total: number }[];
}

type Format = "a4" | "receipt";

export function Invoice({ data }: { data: InvoiceData }) {
  const [format, setFormat] = useState<Format>("receipt");
  const isReceipt = format === "receipt";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Thanh công cụ — ẩn khi in */}
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5">
          {(["receipt", "a4"] as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                format === f ? "bg-neutral-900 text-white" : "text-neutral-600",
              )}
            >
              {f === "receipt" ? "Bill 80mm" : "A4"}
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
      <div
        className={cn(
          "mx-auto bg-white text-black shadow-sm print:shadow-none",
          isReceipt ? "w-[80mm] p-3 text-[12px] leading-tight" : "w-full max-w-[190mm] p-10 text-sm",
        )}
      >
        <div className="text-center">
          <p className={cn("font-semibold", isReceipt ? "text-base" : "text-xl")}>
            {data.orgName}
          </p>
          {data.storeName && <p>{data.storeName}</p>}
          {data.storeAddress && <p className="text-neutral-600">{data.storeAddress}</p>}
          <p className={cn("mt-2 font-semibold uppercase", isReceipt ? "text-sm" : "text-lg")}>
            Hóa đơn bán hàng
          </p>
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
