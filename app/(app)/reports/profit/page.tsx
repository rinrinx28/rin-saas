import { redirect } from "next/navigation";
import { fetchProfitReport } from "@/app/(app)/reports/profit/actions";
import { PageHeader } from "@/components/app-shell/page-header";
import { ProfitReportView } from "@/components/reports/profit-report";
import { getActiveOrgId } from "@/lib/org";

const DEFAULT_DAYS = 30;

export default async function ProfitReportPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const initial = await fetchProfitReport(DEFAULT_DAYS);

  return (
    <>
      <PageHeader
        title="Báo cáo lãi/lỗ"
        description="Lãi gộp theo ngày, sản phẩm và danh mục — cập nhật trực tiếp."
      />
      <ProfitReportView initial={initial} initialDays={DEFAULT_DAYS} />
    </>
  );
}
