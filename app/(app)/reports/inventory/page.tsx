import { redirect } from "next/navigation";
import { fetchInventoryReport } from "@/app/(app)/reports/inventory/actions";
import { DEFAULT_DEAD_DAYS, DEFAULT_THRESHOLD } from "@/app/(app)/reports/inventory/constants";
import { PageHeader } from "@/components/app-shell/page-header";
import { InventoryReportView } from "@/components/reports/inventory-report";
import { getActiveOrgId } from "@/lib/org";

export default async function InventoryReportPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const initial = await fetchInventoryReport(DEFAULT_THRESHOLD, DEFAULT_DEAD_DAYS);

  return (
    <>
      <PageHeader
        title="Báo cáo tồn kho"
        description="Định giá tồn, hàng sắp hết và hàng tồn đọng — cập nhật trực tiếp."
      />
      <InventoryReportView initial={initial} />
    </>
  );
}
