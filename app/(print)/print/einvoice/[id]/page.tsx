import { notFound } from "next/navigation";
import { EInvoiceDocument, type EInvoiceDocData } from "@/components/invoice/einvoice-document";
import { createClient } from "@/lib/supabase/server";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
};

const DEFAULT_UNIT = "Cái";

interface OrderQuery {
  code: string;
  org_id: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total: number;
  organizations: { name: string } | null;
  stores: { name: string; address: string | null } | null;
  customers: { name: string; phone: string | null } | null;
  payments: { method: string }[];
  order_items: {
    qty: number;
    price: number;
    total: number;
    product_variants: { name: string; products: { name: string } | null } | null;
  }[];
}

interface EInvoiceRow {
  provider: string;
  series: string | null;
  invoice_no: string | null;
  tax_authority_code: string | null;
  lookup_url: string | null;
  issued_at: string | null;
  payload: {
    sellerName?: string | null;
    sellerTaxCode?: string | null;
    sellerAddress?: string | null;
    templateNo?: string | null;
  } | null;
}

export default async function PrintEInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: orderData }, { data: eiData }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "code, org_id, created_at, subtotal, discount, total, organizations(name), stores(name, address), customers(name, phone), payments(method), order_items(qty, price, total, product_variants(name, products(name)))",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("einvoices")
      .select("provider, series, invoice_no, tax_authority_code, lookup_url, issued_at, payload")
      .eq("order_id", id)
      .eq("status", "issued")
      .maybeSingle(),
  ]);

  if (!orderData) notFound();
  const o = orderData as unknown as OrderQuery;
  const ei = eiData as EInvoiceRow | null;

  // Chưa phát hành HĐĐT → thông báo, gợi ý phát hành ở trang đơn.
  if (!ei) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center text-black">
        <p className="text-lg font-semibold">Đơn này chưa phát hành hóa đơn điện tử</p>
        <p className="mt-2 text-sm text-neutral-600">
          Vào chi tiết đơn <span className="font-mono">{o.code}</span> và bấm “Phát hành HĐĐT” trước,
          rồi xem lại bản thể hiện ở đây.
        </p>
      </div>
    );
  }

  const data: EInvoiceDocData = {
    templateNo: ei.payload?.templateNo ?? null,
    series: ei.series,
    invoiceNo: ei.invoice_no,
    taxAuthorityCode: ei.tax_authority_code,
    issuedAt: ei.issued_at,
    lookupUrl: ei.lookup_url,
    isStub: ei.provider === "stub",
    sellerName: ei.payload?.sellerName || o.organizations?.name || o.stores?.name || "Cửa hàng",
    sellerTaxCode: ei.payload?.sellerTaxCode ?? null,
    sellerAddress: ei.payload?.sellerAddress || o.stores?.address || null,
    buyerName: o.customers?.name ?? "Khách lẻ",
    buyerPhone: o.customers?.phone ?? null,
    orderCode: o.code,
    paymentMethod: METHOD_LABEL[o.payments[0]?.method] ?? "Tiền mặt",
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    items: o.order_items.map((it) => ({
      name: `${it.product_variants?.products?.name ?? "?"} — ${it.product_variants?.name ?? ""}`,
      unit: DEFAULT_UNIT,
      qty: it.qty,
      price: it.price,
      total: it.total,
    })),
  };

  return <EInvoiceDocument data={data} />;
}
