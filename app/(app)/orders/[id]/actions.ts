"use server";

import { revalidatePath } from "next/cache";
import { getEInvoiceProvider, type EInvoiceConfig, type EInvoiceOrder } from "@/lib/einvoice";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

interface EInvoiceConfigRow {
  provider: string;
  enabled: boolean;
  seller_tax_code: string | null;
  seller_name: string | null;
  seller_address: string | null;
  template_no: string | null;
  series: string | null;
  api_endpoint: string | null;
  api_username: string | null;
  api_secret: string | null;
}

function toConfig(row: EInvoiceConfigRow | null): EInvoiceConfig | null {
  if (!row) return null;
  return {
    provider: row.provider,
    enabled: row.enabled,
    sellerTaxCode: row.seller_tax_code,
    sellerName: row.seller_name,
    sellerAddress: row.seller_address,
    templateNo: row.template_no,
    series: row.series,
    apiEndpoint: row.api_endpoint,
    apiUsername: row.api_username,
    apiSecret: row.api_secret,
  };
}

export interface ActionResult {
  error?: string;
}

interface OrderForEInvoice {
  id: string;
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  stores: { name: string; address: string | null } | null;
  customers: { name: string; phone: string | null } | null;
  order_items: {
    qty: number;
    price: number;
    total: number;
    product_variants: { name: string; products: { name: string } | null } | null;
  }[];
}

// Phát hành HĐĐT cho một đơn: gọi provider → ghi nhận kết quả qua RPC.
export async function issueEInvoiceAction(orderId: string): Promise<ActionResult> {
  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: "Bạn không có quyền phát hành HĐĐT" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, subtotal, discount, total, created_at, stores(name, address), customers(name, phone), order_items(qty, price, total, product_variants(name, products(name)))",
    )
    .eq("id", orderId)
    .single();
  if (!data) return { error: "Không tìm thấy đơn hàng" };
  const order = data as unknown as OrderForEInvoice;

  const payload: EInvoiceOrder = {
    id: order.id,
    code: order.code,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    createdAt: order.created_at,
    storeName: order.stores?.name ?? "",
    storeAddress: order.stores?.address ?? null,
    customerName: order.customers?.name ?? null,
    customerPhone: order.customers?.phone ?? null,
    items: order.order_items.map((it) => ({
      name: `${it.product_variants?.products?.name ?? "?"} — ${it.product_variants?.name ?? ""}`,
      qty: it.qty,
      price: it.price,
      total: it.total,
    })),
  };

  // Cấu hình HĐĐT per-tenant (chọn provider + thông tin người bán/ký hiệu).
  const { data: cfgRow } = await supabase
    .from("einvoice_config")
    .select(
      "provider, enabled, seller_tax_code, seller_name, seller_address, template_no, series, api_endpoint, api_username, api_secret",
    )
    .eq("org_id", orgId)
    .maybeSingle();
  const config = toConfig(cfgRow as EInvoiceConfigRow | null);

  const provider = getEInvoiceProvider(config?.provider);
  let result;
  try {
    result = await provider.issue(payload, config);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    result = { status: "failed" as const, error: message };
  }

  const { error: rpcError } = await supabase.rpc("issue_einvoice", {
    p_order: orderId,
    p_provider: provider.key,
    p_status: result.status,
    p_series: result.series ?? null,
    p_no: result.invoiceNo ?? null,
    p_cqt: result.taxAuthorityCode ?? null,
    p_lookup: result.lookupUrl ?? null,
    p_pdf: result.pdfUrl ?? null,
    p_error: result.error ?? null,
    p_payload: result.payload ?? null,
  });
  if (rpcError) {
    if (rpcError.message?.includes("quyền")) return { error: "Bạn không có quyền phát hành HĐĐT" };
    return { error: "Không ghi nhận được HĐĐT" };
  }

  if (result.status === "failed") {
    return { error: result.error ?? "Nhà cung cấp từ chối phát hành" };
  }

  revalidatePath(`/orders/${orderId}`);
  return {};
}
