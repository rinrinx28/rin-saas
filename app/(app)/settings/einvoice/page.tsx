import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { EInvoiceConfigForm } from "@/components/settings/einvoice-config-form";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { EInvoiceConfigInput } from "@/lib/validations/settings";

interface ConfigRow {
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

const DEFAULTS: EInvoiceConfigInput = {
  provider: "stub",
  enabled: false,
  sellerTaxCode: "",
  sellerName: "",
  sellerAddress: "",
  templateNo: "",
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
      "provider, enabled, seller_tax_code, seller_name, seller_address, template_no, series, api_endpoint, api_username, api_secret",
    )
    .eq("org_id", orgId)
    .maybeSingle();

  const row = data as ConfigRow | null;
  const initial: EInvoiceConfigInput = row
    ? {
        provider: row.provider,
        enabled: row.enabled,
        sellerTaxCode: row.seller_tax_code ?? "",
        sellerName: row.seller_name ?? "",
        sellerAddress: row.seller_address ?? "",
        templateNo: row.template_no ?? "",
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
        description="Chọn nhà cung cấp và khai báo thông tin phát hành HĐĐT (ADR 0008)."
      />
      <EInvoiceConfigForm initial={initial} />
    </>
  );
}
