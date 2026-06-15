// Hợp đồng adapter HĐĐT — ADR 0008. Provider thật (Viettel/MISA/VNPT)
// cài đặt interface này; mặc định dùng stub.

export interface EInvoiceOrderItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

// Dữ liệu đơn tối thiểu để phát hành HĐĐT.
export interface EInvoiceOrder {
  id: string;
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  storeName: string;
  storeAddress: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: EInvoiceOrderItem[];
}

// Cấu hình HĐĐT per-tenant (từ bảng einvoice_config). Provider thật dùng
// credentials ở đây; stub dùng seller info + ký hiệu để sinh dữ liệu giả.
export interface EInvoiceConfig {
  provider: string;
  enabled: boolean;
  sellerTaxCode: string | null;
  sellerName: string | null;
  sellerAddress: string | null;
  templateNo: string | null;
  series: string | null;
  apiEndpoint: string | null;
  apiUsername: string | null;
  apiSecret: string | null;
}

// Kết quả phát hành (đã được provider chuẩn hóa).
export interface IssueResult {
  status: "issued" | "failed";
  series?: string; // ký hiệu hóa đơn
  invoiceNo?: string; // số hóa đơn
  taxAuthorityCode?: string; // mã CQT
  lookupUrl?: string; // link tra cứu
  pdfUrl?: string;
  error?: string;
  payload?: unknown; // dữ liệu thô từ provider
}

export interface EInvoiceProvider {
  readonly key: string;
  readonly name: string;
  issue(order: EInvoiceOrder, config: EInvoiceConfig | null): Promise<IssueResult>;
}
