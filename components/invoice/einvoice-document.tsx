"use client";

import { Printer } from "lucide-react";
import { formatVnd } from "@/lib/utils";
import { vndToWords } from "@/lib/vnd-words";

export interface EInvoiceDocItem {
  name: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
}

export interface EInvoiceDocData {
  templateNo: string | null;
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

function dmy(iso: string): string {
  const d = new Date(iso);
  return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export function EInvoiceDocument({ data }: { data: EInvoiceDocData }) {
  const issuedAt = data.issuedAt ?? new Date(0).toISOString();

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

      <div className="mx-auto w-[190mm] max-w-full bg-white p-[12mm] text-[13px] leading-relaxed shadow-sm print:w-full print:p-0 print:shadow-none">
        {data.isStub && (
          <p className="mb-4 rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-center text-[12px] font-medium text-amber-700 print:hidden">
            Bản giả lập (test) — số/ký hiệu/mã CQT là dữ liệu mẫu, chưa có giá trị pháp lý.
          </p>
        )}

        {/* Tiêu đề + mã số hóa đơn */}
        <header className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="text-center">
            <h1 className="text-lg font-bold uppercase tracking-wide">Hóa đơn giá trị gia tăng</h1>
            <p className="italic text-neutral-600">(Bản thể hiện của hóa đơn điện tử)</p>
            <p className="mt-1 text-neutral-700">{dmy(issuedAt)}</p>
          </div>
          <dl className="space-y-0.5 whitespace-nowrap text-[12px]">
            <Pair label="Mẫu số" value={data.templateNo ?? "1"} />
            <Pair label="Ký hiệu" value={data.series ?? "—"} mono />
            <Pair label="Số" value={data.invoiceNo ?? "—"} mono />
          </dl>
        </header>

        {data.taxAuthorityCode && (
          <p className="mt-2 text-center text-[12px] text-neutral-700">
            Mã của cơ quan thuế:{" "}
            <span className="font-mono font-medium tracking-wide">{data.taxAuthorityCode}</span>
          </p>
        )}

        {/* Người bán / người mua */}
        <section className="mt-5 space-y-1 border-t border-neutral-300 pt-4">
          <InfoLine label="Đơn vị bán hàng" value={data.sellerName} strong />
          <InfoLine label="Mã số thuế" value={data.sellerTaxCode ?? "—"} mono />
          <InfoLine label="Địa chỉ" value={data.sellerAddress ?? "—"} />
        </section>
        <section className="mt-3 space-y-1">
          <InfoLine label="Họ tên người mua hàng" value={data.buyerName} />
          <InfoLine label="Số điện thoại" value={data.buyerPhone ?? "—"} />
          <InfoLine label="Hình thức thanh toán" value={data.paymentMethod} />
        </section>

        {/* Bảng hàng hóa */}
        <table className="mt-5 w-full border-collapse text-[12px]">
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
                <Td className="text-right tabular-nums">{formatVnd(it.price)}</Td>
                <Td className="text-right tabular-nums">{formatVnd(it.total)}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tổng kết */}
        <div className="mt-4 ml-auto w-full max-w-[80mm] space-y-1 text-[12px]">
          <SumLine label="Cộng tiền hàng" value={formatVnd(data.subtotal)} />
          {data.discount > 0 && <SumLine label="Chiết khấu" value={`- ${formatVnd(data.discount)}`} />}
          <SumLine label="Thuế suất GTGT" value="KCT" />
          <SumLine label="Tiền thuế GTGT" value={formatVnd(0)} />
          <div className="flex justify-between border-t border-neutral-400 pt-1.5 text-[13px] font-semibold">
            <span>Tổng cộng tiền thanh toán</span>
            <span className="tabular-nums">{formatVnd(data.total)}</span>
          </div>
        </div>

        <p className="mt-2 text-[12px]">
          <span className="text-neutral-600">Số tiền viết bằng chữ: </span>
          <span className="italic">{vndToWords(data.total)}</span>
        </p>

        {/* Tra cứu + chữ ký */}
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-neutral-300 pt-4 text-center text-[12px]">
          <div>
            <p className="font-medium">NGƯỜI MUA HÀNG</p>
            <p className="italic text-neutral-500">(Chữ ký điện tử, nếu có)</p>
          </div>
          <div>
            <p className="font-medium">NGƯỜI BÁN HÀNG</p>
            <p className="italic text-neutral-500">(Chữ ký điện tử)</p>
          </div>
        </div>

        {data.lookupUrl && (
          <p className="mt-5 border-t border-dashed border-neutral-300 pt-3 text-center text-[11px] text-neutral-600">
            Tra cứu hóa đơn tại:{" "}
            <a href={data.lookupUrl} className="underline" target="_blank" rel="noopener noreferrer">
              {data.lookupUrl}
            </a>
            {" · "}Mã đơn: <span className="font-mono">{data.orderCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Pair({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-600">{label}:</span>
      <span className={mono ? "font-mono font-medium" : "font-medium"}>{value}</span>
    </div>
  );
}

function InfoLine({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <p>
      <span className="text-neutral-600">{label}: </span>
      <span className={`${strong ? "font-semibold" : ""} ${mono ? "font-mono" : ""}`}>{value}</span>
    </p>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`border border-neutral-400 px-2 py-1.5 font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-neutral-300 px-2 py-1.5 ${className}`}>{children}</td>;
}
function SumLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
