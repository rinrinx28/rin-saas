import { StockReceipt, type StockReceiptData } from "@/components/invoice/stock-receipt";

// Xem trước Phiếu nhập kho (Mẫu 01-VT) với dữ liệu mẫu — không phụ thuộc DB.
const SAMPLE: StockReceiptData = {
  orgName: "Cửa hàng Tạp hóa Minh An",
  storeName: "Chi nhánh Quận 1",
  storeAddress: "12 Nguyễn Trãi, P. Bến Thành, Q.1, TP. Hồ Chí Minh",
  receiptNo: "PNK260616-04821",
  createdAt: "2026-06-16T09:15:00.000Z",
  supplierName: "Công ty TNHH Phân phối Tân Phát",
  note: "Nhập hàng đầu tháng",
  total: 4_250_000,
  items: [
    { name: "Nước ngọt Coca-Cola 330ml — Thùng 24", code: "8935001234567", unit: "Thùng", qty: 20, cost: 150000, total: 3000000 },
    { name: "Bánh quy Cosy — Hộp", code: "8934567890123", unit: "Hộp", qty: 25, cost: 30000, total: 750000 },
    { name: "Cà phê G7 — Bịch 20 gói", code: "CF-G7-20", unit: "Bịch", qty: 10, cost: 50000, total: 500000 },
  ],
};

export default function StockReceiptPreviewPage() {
  return (
    <div className="min-h-dvh bg-neutral-100 py-6">
      <StockReceipt data={SAMPLE} />
    </div>
  );
}
