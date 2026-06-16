"use client";

import { Printer, ShieldCheck } from "lucide-react";
import { vndToWords } from "@/lib/vnd-words";

export interface EInvoiceDocItem {
  name: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
}

export interface EInvoiceDocData {
  invoiceType: "sales" | "gtgt";
  taxRate: number;
  series: string | null;
  invoiceNo: string | null;
  taxAuthorityCode: string | null;
  issuedAt: string | null;
  lookupUrl: string | null;
  isStub: boolean;
  sellerName: string;
  sellerTaxCode: string | null;
  sellerAddress: string | null;
  buyerName: string;
  buyerPhone: string | null;
  orderCode: string;
  paymentMethod: string;
  items: EInvoiceDocItem[];
  subtotal: number;
  discount: number;
  total: number;
}

const PAGE_STYLE = "@page { size: A4; margin: 14mm; } @media print { html, body { background: #fff !important; } }";
const SERIF = '"Times New Roman", Times, serif';

// Số: dấu chấm ngăn nghìn, không kèm ký hiệu tiền (đơn vị tiền tệ ghi riêng) — NĐ 123.
const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");

function dmy(iso: string): string {
  const d = new Date(iso);
  return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}
function dmyhm(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Line {
  label: string;
  value: string;
  strong?: boolean;
}

// Suy ra dòng tổng kết + thành tiền hiển thị theo loại hóa đơn.
function buildTotals(data: EInvoiceDocData): {
  rows: { price: number; total: number }[];
  summary: Line[];
} {
  if (data.invoiceType === "gtgt") {
    const div = 1 + data.taxRate / 100;
    const rows = data.items.map((it) => ({
      price: Math.round(it.price / div),
      total: Math.round(it.total / div),
    }));
    const preTax = rows.reduce((s, r) => s + r.total, 0);
    const tax = data.total - preTax; // giữ tổng = số tiền thực trả
    return {
      rows,
      summary: [
        { label: "Cộng tiền hàng (chưa thuế)", value: fmt(preTax) },
        { label: "Thuế suất GTGT", value: data.taxRate === 0 ? "0% / KCT" : `${data.taxRate}%` },
        { label: "Tiền thuế GTGT", value: fmt(tax) },
        { label: "Tổng cộng tiền thanh toán", value: fmt(data.total), strong: true },
      ],
    };
  }
  // Hóa đơn bán hàng — giá đã gồm thuế, không tách.
  const rows = data.items.map((it) => ({ price: it.price, total: it.total }));
  const summary: Line[] = [{ label: "Cộng tiền hàng", value: fmt(data.subtotal) }];
  if (data.discount > 0) summary.push({ label: "Chiết khấu", value: `- ${fmt(data.discount)}` });
  summary.push({ label: "Tổng cộng tiền thanh toán", value: fmt(data.total), strong: true });
  return { rows, summary };
}

export function EInvoiceDocument({ data }: { data: EInvoiceDocData }) {
  const issuedAt = data.issuedAt ?? new Date(0).toISOString();
  const isGtgt = data.invoiceType === "gtgt";
  const title = isGtgt ? "HÓA ĐƠN GIÁ TRỊ GIA TĂNG" : "HÓA ĐƠN BÁN HÀNG";
  const mauSo = isGtgt ? "1" : "2";
  const { rows, summary } = buildTotals(data);

  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 text-black print:max-w-none print:p-0">
      <style>{PAGE_STYLE}</style>

      {/* Thanh công cụ — ẩn khi in */}
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-neutral-500">Bản thể hiện của hóa đơn điện tử</p>
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
        {data.isStub && (
          <p className="mb-4 rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-center text-[12px] font-medium text-amber-700 print:hidden">
            Bản giả lập (test) — số/ký hiệu/mã CQT là dữ liệu mẫu, chưa có giá trị pháp lý.
          </p>
        )}

        {/* Tiêu đề + ký hiệu/số */}
        <header className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase tracking-wide">{title}</h1>
            <p className="italic text-neutral-600">(Bản thể hiện của hóa đơn điện tử)</p>
            <p className="mt-1 text-neutral-700">{dmy(issuedAt)}</p>
          </div>
          <dl className="space-y-0.5 whitespace-nowrap text-[12px]">
            <Pair label="Mẫu số" value={mauSo} />
            <Pair label="Ký hiệu" value={data.series ?? "—"} />
            <Pair label="Số" value={data.invoiceNo ?? "—"} />
          </dl>
        </header>

        {data.taxAuthorityCode && (
          <p className="mt-2 text-center text-[12px] text-neutral-700">
            Mã của cơ quan thuế:{" "}
            <span className="font-medium tracking-wide">{data.taxAuthorityCode}</span>
          </p>
        )}

        {/* Người bán / người mua */}
        <section className="mt-5 space-y-1 border-t border-neutral-300 pt-4">
          <InfoLine label="Đơn vị bán hàng" value={data.sellerName} strong />
          <InfoLine label="Mã số thuế" value={data.sellerTaxCode ?? "—"} />
          <InfoLine label="Địa chỉ" value={data.sellerAddress ?? "—"} />
        </section>
        <section className="mt-3 space-y-1">
          <InfoLine label="Họ tên người mua hàng" value={data.buyerName} />
          <InfoLine label="Số điện thoại" value={data.buyerPhone ?? "—"} />
          <InfoLine label="Hình thức thanh toán" value={data.paymentMethod} />
        </section>

        <p className="mt-4 text-right text-[12px] text-neutral-600">Đơn vị tiền tệ: VND</p>

        {/* Bảng hàng hóa */}
        <table className="mt-1 w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-neutral-100 text-center">
              <Th className="w-8">STT</Th>
              <Th className="text-left">Tên hàng hóa, dịch vụ</Th>
              <Th className="w-12">ĐVT</Th>
              <Th className="w-14">SL</Th>
              <Th className="w-28">Đơn giá</Th>
              <Th className="w-32">Thành tiền</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it, i) => (
              <tr key={i} className="align-top">
                <Td className="text-center">{i + 1}</Td>
                <Td>{it.name}</Td>
                <Td className="text-center">{it.unit}</Td>
                <Td className="text-right tabular-nums">{it.qty}</Td>
                <Td className="text-right tabular-nums">{fmt(rows[i].price)}</Td>
                <Td className="text-right tabular-nums">{fmt(rows[i].total)}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tổng kết */}
        <div className="mt-4 ml-auto w-full max-w-[85mm] space-y-1 text-[12px]">
          {summary.map((s) => (
            <div
              key={s.label}
              className={
                s.strong
                  ? "flex justify-between border-t border-neutral-400 pt-1.5 text-[13px] font-semibold"
                  : "flex justify-between"
              }
            >
              <span className={s.strong ? "" : "text-neutral-600"}>{s.label}</span>
              <span className="tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[12px]">
          <span className="text-neutral-600">Số tiền viết bằng chữ: </span>
          <span className="italic">{vndToWords(data.total)}</span>
        </p>

        {/* Chữ ký */}
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-neutral-300 pt-4 text-center text-[12px]">
          <div>
            <p className="font-medium">NGƯỜI MUA HÀNG</p>
            <p className="italic text-neutral-500">(Chữ ký điện tử, nếu có)</p>
          </div>
          <div>
            <p className="font-medium">NGƯỜI BÁN HÀNG</p>
            {/* Hiển thị chữ ký số (bắt buộc với HĐĐT) */}
            <div className="mx-auto mt-2 max-w-[60mm] rounded border border-emerald-500 bg-emerald-50/60 px-2 py-1.5 text-left text-[11px] text-emerald-800">
              <p className="flex items-center gap-1 font-medium">
                <ShieldCheck className="size-3.5" /> Đã ký điện tử
              </p>
              <p>Ký bởi: {data.sellerName}</p>
              <p>Ký ngày: {dmyhm(issuedAt)}</p>
            </div>
          </div>
        </div>

        {data.lookupUrl && (
          <p className="mt-5 border-t border-dashed border-neutral-300 pt-3 text-center text-[11px] text-neutral-600">
            Tra cứu hóa đơn tại:{" "}
            <a href={data.lookupUrl} className="underline" target="_blank" rel="noopener noreferrer">
              {data.lookupUrl}
            </a>
            {" · "}Mã đơn: <span className="tabular-nums">{data.orderCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-600">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InfoLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <p>
      <span className="text-neutral-600">{label}: </span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </p>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`border border-neutral-400 px-2 py-1.5 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-neutral-300 px-2 py-1.5 ${className}`}>{children}</td>;
}
