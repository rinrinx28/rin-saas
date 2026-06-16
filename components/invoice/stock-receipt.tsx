"use client";

import { Printer } from "lucide-react";
import { vndToWords } from "@/lib/vnd-words";

export interface StockReceiptItem {
  name: string;
  code: string;
  unit: string;
  qty: number;
  cost: number;
  total: number;
}

export interface StockReceiptData {
  orgName: string;
  storeName: string;
  storeAddress: string | null;
  receiptNo: string;
  createdAt: string;
  supplierName: string | null;
  note: string | null;
  items: StockReceiptItem[];
  total: number;
}

const PAGE_STYLE = "@page { size: A4; margin: 14mm; } @media print { html, body { background: #fff !important; } }";
const SERIF = '"Times New Roman", Times, serif';

const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");

function dmy(iso: string): { d: number; m: number; y: number } {
  const dt = new Date(iso);
  return { d: dt.getDate(), m: dt.getMonth() + 1, y: dt.getFullYear() };
}

export function StockReceipt({ data }: { data: StockReceiptData }) {
  const { d, m, y } = dmy(data.createdAt);

  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 text-black print:max-w-none print:p-0">
      <style>{PAGE_STYLE}</style>

      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-neutral-500">Phiếu nhập kho (Mẫu 01-VT)</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          <Printer className="size-4" /> In / Lưu PDF
        </button>
      </div>

      <div
        className="mx-auto w-[190mm] max-w-full bg-white p-[12mm] text-[13px] leading-relaxed shadow-sm print:w-full print:p-0 print:shadow-none"
        style={{ fontFamily: SERIF }}
      >
        {/* Đầu phiếu: đơn vị (trái) + mẫu số (phải) */}
        <header className="flex items-start justify-between gap-6 text-[12px]">
          <div>
            <p className="font-semibold uppercase">{data.orgName}</p>
            <p>Bộ phận: {data.storeName}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">Mẫu số 01 - VT</p>
            <p className="italic text-neutral-600">
              (Ban hành theo Thông tư số 133/2016/TT-BTC
              <br />
              ngày 26/8/2016 của Bộ Tài chính)
            </p>
          </div>
        </header>

        {/* Tiêu đề */}
        <div className="mt-4 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide">Phiếu nhập kho</h1>
          <p className="mt-1">
            Ngày {d} tháng {m} năm {y}
          </p>
          <p>
            Số: <span className="font-medium">{data.receiptNo}</span>
          </p>
        </div>

        {/* Thông tin nhập */}
        <div className="mt-4 space-y-1 text-[12.5px]">
          <p>
            <span className="text-neutral-600">- Họ và tên người giao: </span>
            <span className="font-medium">{data.supplierName ?? "………………………………"}</span>
          </p>
          <p className="text-neutral-600">
            - Theo …………… số ………… ngày … tháng … năm … của ……………………………………
          </p>
          <p>
            <span className="text-neutral-600">- Nhập tại kho: </span>
            <span className="font-medium">{data.storeName}</span>
            <span className="text-neutral-600"> Địa điểm: </span>
            <span>{data.storeAddress ?? "…………………………"}</span>
          </p>
        </div>

        {/* Bảng vật tư — Mẫu 01-VT */}
        <table className="mt-3 w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-center">
              <Th rowSpan={2} className="w-8">STT</Th>
              <Th rowSpan={2} className="text-left">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, hàng hóa</Th>
              <Th rowSpan={2} className="w-20">Mã số</Th>
              <Th rowSpan={2} className="w-14">ĐVT</Th>
              <Th colSpan={2}>Số lượng</Th>
              <Th rowSpan={2} className="w-24">Đơn giá</Th>
              <Th rowSpan={2} className="w-28">Thành tiền</Th>
            </tr>
            <tr className="text-center">
              <Th className="w-20">Theo chứng từ</Th>
              <Th className="w-20">Thực nhập</Th>
            </tr>
            <tr className="text-center text-[11px] italic text-neutral-500">
              <Td>A</Td>
              <Td>B</Td>
              <Td>C</Td>
              <Td>D</Td>
              <Td>1</Td>
              <Td>2</Td>
              <Td>3</Td>
              <Td>4</Td>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} className="align-top">
                <Td className="text-center">{i + 1}</Td>
                <Td>{it.name}</Td>
                <Td className="text-center">{it.code || "—"}</Td>
                <Td className="text-center">{it.unit}</Td>
                <Td className="text-right tabular-nums">{it.qty}</Td>
                <Td className="text-right tabular-nums">{it.qty}</Td>
                <Td className="text-right tabular-nums">{fmt(it.cost)}</Td>
                <Td className="text-right tabular-nums">{fmt(it.total)}</Td>
              </tr>
            ))}
            <tr className="font-semibold">
              <Td className="text-center" colSpan={7}>
                Cộng
              </Td>
              <Td className="text-right tabular-nums">{fmt(data.total)}</Td>
            </tr>
          </tbody>
        </table>

        <p className="mt-3 text-[12.5px]">
          <span className="text-neutral-600">- Tổng số tiền (viết bằng chữ): </span>
          <span className="italic">{vndToWords(data.total)}</span>
        </p>
        <p className="text-[12.5px] text-neutral-600">- Số chứng từ gốc kèm theo: …………………………………………</p>

        <p className="mt-4 text-right text-[12.5px] italic">
          Ngày {d} tháng {m} năm {y}
        </p>

        {/* Chữ ký — 4 cột theo 01-VT */}
        <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[12px]">
          <Sign title="Người lập phiếu" />
          <Sign title="Người giao hàng" />
          <Sign title="Thủ kho" />
          <Sign title="Kế toán trưởng" note="(Hoặc bộ phận có nhu cầu nhập)" />
        </div>
      </div>
    </div>
  );
}

function Sign({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="italic text-neutral-500">(Ký, họ tên)</p>
      {note && <p className="mt-0.5 text-[10px] italic text-neutral-400">{note}</p>}
    </div>
  );
}

function Th({
  children,
  className = "",
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
}) {
  return (
    <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-neutral-400 px-2 py-1 font-medium ${className}`}>
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`border border-neutral-300 px-2 py-1 ${className}`}>
      {children}
    </td>
  );
}
