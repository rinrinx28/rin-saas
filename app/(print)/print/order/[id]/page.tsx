import { notFound } from "next/navigation";
import { Invoice, type InvoiceData } from "@/components/invoice/invoice";
import { buildBankQrUrl, effectiveBank, transferMemo } from "@/lib/payment/bank-qr";
import { createClient } from "@/lib/supabase/server";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
};

interface OrderQuery {
  code: string;
  org_id: string;
  store_id: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  organizations: { name: string; bank_name: string | null; bank_account: string | null; bank_holder: string | null } | null;
  stores: { name: string; address: string | null; bank_name: string | null; bank_account: string | null; bank_holder: string | null } | null;
  customers: { name: string; phone: string | null } | null;
  payments: { method: string }[];
  order_items: {
    qty: number;
    price: number;
    total: number;
    product_variants: { name: string; products: { name: string } | null } | null;
  }[];
}

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "code, org_id, store_id, created_at, subtotal, discount, total, paid, organizations(name, bank_name, bank_account, bank_holder), stores(name, address, bank_name, bank_account, bank_holder), customers(name, phone), payments(method), order_items(qty, price, total, product_variants(name, products(name)))",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const o = data as unknown as OrderQuery;

  const bank = effectiveBank(
    {
      name: o.organizations?.bank_name ?? null,
      account: o.organizations?.bank_account ?? null,
      holder: o.organizations?.bank_holder ?? null,
    },
    {
      name: o.stores?.bank_name ?? null,
      account: o.stores?.bank_account ?? null,
      holder: o.stores?.bank_holder ?? null,
    },
  );
  const qrMemo = transferMemo(o.code);
  const qrUrl = buildBankQrUrl(bank, o.total, qrMemo);

  const invoice: InvoiceData = {
    code: o.code,
    createdAt: o.created_at,
    orgName: o.organizations?.name ?? "Cửa hàng",
    storeName: o.stores?.name ?? "",
    storeAddress: o.stores?.address ?? null,
    customerName: o.customers?.name ?? null,
    method: METHOD_LABEL[o.payments[0]?.method] ?? "Tiền mặt",
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    paid: o.paid,
    qrUrl,
    qrMemo: qrUrl ? qrMemo : null,
    items: o.order_items.map((it) => ({
      name: `${it.product_variants?.products?.name ?? "?"} — ${it.product_variants?.name ?? ""}`,
      qty: it.qty,
      price: it.price,
      total: it.total,
    })),
  };

  return <Invoice data={invoice} />;
}
