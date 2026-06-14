import { notFound } from "next/navigation";
import { Invoice, type InvoiceData } from "@/components/invoice/invoice";
import { createClient } from "@/lib/supabase/server";

interface OrderQuery {
  code: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
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
      "code, created_at, subtotal, discount, total, paid, organizations(name), stores(name, address), customers(name, phone), payments(method), order_items(qty, price, total, product_variants(name, products(name)))",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const o = data as unknown as OrderQuery;

  const invoice: InvoiceData = {
    code: o.code,
    createdAt: o.created_at,
    orgName: o.organizations?.name ?? "Cửa hàng",
    storeName: o.stores?.name ?? "",
    storeAddress: o.stores?.address ?? null,
    customerName: o.customers?.name ?? null,
    method: o.payments[0]?.method === "transfer" ? "Chuyển khoản" : "Tiền mặt",
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    paid: o.paid,
    items: o.order_items.map((it) => ({
      name: `${it.product_variants?.products?.name ?? "?"} — ${it.product_variants?.name ?? ""}`,
      qty: it.qty,
      price: it.price,
      total: it.total,
    })),
  };

  return <Invoice data={invoice} />;
}
