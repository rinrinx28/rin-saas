import { EInvoiceDocument, type EInvoiceDocData } from "@/components/invoice/einvoice-document";

// Trang xem trước bản thể hiện HĐĐT với dữ liệu mẫu — để test giao diện
// trước khi cắm nhà cung cấp thật. Không phụ thuộc DB.
const SAMPLE: EInvoiceDocData = {
  templateNo: "1",
  series: "C26TYY",
  invoiceNo: "00000123",
  taxAuthorityCode: "00A1B2C3D4E5F60718293A4B5C6D7E8F90",
  issuedAt: "2026-06-16T10:30:45.000Z",
  lookupUrl: "https://tra-cuu-hddt.example/lookup?code=00A1B2C3D4E5F6",
  isStub: true,
  sellerName: "Cửa hàng Tạp hóa Minh An",
  sellerTaxCode: "0312345678",
  sellerAddress: "12 Nguyễn Trãi, P. Bến Thành, Q.1, TP. Hồ Chí Minh",
  buyerName: "Nguyễn Văn A",
  buyerPhone: "0901234567",
  orderCode: "HD260616-103045",
  paymentMethod: "Tiền mặt",
  items: [
    { name: "Nước ngọt Coca-Cola 330ml — Lon", unit: "Lon", qty: 10, price: 10000, total: 100000 },
    { name: "Bánh mì ngọt — Cái", unit: "Cái", qty: 5, price: 12000, total: 60000 },
    { name: "Cà phê sữa đá — Ly", unit: "Ly", qty: 3, price: 30000, total: 90000 },
  ],
  subtotal: 250000,
  discount: 0,
  total: 250000,
};

export default function EInvoicePreviewPage() {
  return (
    <div className="min-h-dvh bg-neutral-100">
      <EInvoiceDocument data={SAMPLE} />
    </div>
  );
}
