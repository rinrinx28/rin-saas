"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrgId, isManager } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { einvoiceConfigSchema } from "@/lib/validations/settings";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

const orNull = (v?: string): string | null => (v && v.trim() ? v.trim() : null);

export async function updateEInvoiceConfigAction(values: unknown): Promise<ActionResult> {
  const parsed = einvoiceConfigSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Chưa chọn cửa hàng" };
  if (!(await isManager(orgId))) return { error: "Bạn không có quyền cấu hình HĐĐT" };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("einvoice_config").upsert({
    org_id: orgId,
    provider: d.provider,
    enabled: d.enabled,
    seller_tax_code: orNull(d.sellerTaxCode),
    seller_name: orNull(d.sellerName),
    seller_address: orNull(d.sellerAddress),
    template_no: orNull(d.templateNo),
    series: orNull(d.series),
    api_endpoint: orNull(d.apiEndpoint),
    api_username: orNull(d.apiUsername),
    api_secret: orNull(d.apiSecret),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Không lưu được cấu hình HĐĐT" };

  revalidatePath("/settings/einvoice");
  return { success: true };
}
