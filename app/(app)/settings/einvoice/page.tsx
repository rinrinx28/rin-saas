import { Construction } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { EInvoiceConfigForm } from "@/components/settings/einvoice-config-form";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { EInvoiceConfigInput } from "@/lib/validations/settings";

interface ConfigRow {
  provider: string;
  enabled: boolean;
  invoice_type: "sales" | "gtgt";
  tax_rate: number;
  seller_tax_code: string | null;
  seller_name: string | null;
  seller_address: string | null;
  series: string | null;
  api_endpoint: string | null;
  api_username: string | null;
  api_secret: string | null;
}

const DEFAULTS: EInvoiceConfigInput = {
  provider: "stub",
  enabled: false,
  invoiceType: "sales",
  taxRate: 10,
  sellerTaxCode: "",
  sellerName: "",
  sellerAddress: "",
  series: "",
  apiEndpoint: "",
  apiUsername: "",
  apiSecret: "",
};

export default async function EInvoiceSettingsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  // Cấu hình chứa credentials → chỉ quản lý xem được.
  if (!(await isManager(orgId))) {
    return (
      <>
        <PageHeader title="Hóa đơn điện tử" description="Cấu hình phát hành HĐĐT cho cửa hàng." />
        <p className="rounded-md border border-border bg-surface-2 px-4 py-6 text-sm text-fg-muted">
          Chỉ quản lý (chủ cửa hàng / quản trị) mới được cấu hình hóa đơn điện tử.
        </p>
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("einvoice_config")
    .select(
      "provider, enabled, invoice_type, tax_rate, seller_tax_code, seller_name, seller_address, series, api_endpoint, api_username, api_secret",
    )
    .eq("org_id", orgId)
    .maybeSingle();

  const row = data as ConfigRow | null;
  const initial: EInvoiceConfigInput = row
    ? {
        provider: row.provider,
        enabled: row.enabled,
        invoiceType: row.invoice_type,
        taxRate: row.tax_rate,
        sellerTaxCode: row.seller_tax_code ?? "",
        sellerName: row.seller_name ?? "",
        sellerAddress: row.seller_address ?? "",
        series: row.series ?? "",
        apiEndpoint: row.api_endpoint ?? "",
        apiUsername: row.api_username ?? "",
        apiSecret: row.api_secret ?? "",
      }
    : DEFAULTS;

  return (
    <>
      <PageHeader
        title="Hóa đơn điện tử"
        description="Chọn nhà cung cấp và khai báo thông tin phát hành HĐĐT."
      />
      <div className="mb-6 flex items-start gap-2.5 rounded-md border border-info/30 bg-info-bg px-4 py-3 text-sm text-info">
        <Construction className="mt-0.5 size-4 shrink-0" />
        <p>
          <b>Đang phát triển.</b> Tính năng phát hành hóa đơn điện tử sẽ sớm ra mắt. Bạn có thể khai
          báo trước thông tin người bán &amp; nhà cung cấp bên dưới để dùng ngay khi mở.
        </p>
      </div>
      <EInvoiceConfigForm initial={initial} />
    </>
  );
}
