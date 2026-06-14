import { redirect } from "next/navigation";
import { fetchReportData } from "@/app/(app)/reports/actions";
import { PageHeader } from "@/components/app-shell/page-header";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { getActiveOrgId } from "@/lib/org";

const DEFAULT_DAYS = 30;

export default async function ReportsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const initial = await fetchReportData(DEFAULT_DAYS);

  return (
    <>
      <PageHeader
        title="Báo cáo"
        description="Phân tích bán hàng, nhập hàng, khách hàng và nhà cung cấp — cập nhật trực tiếp."
      />
      <ReportsDashboard initial={initial} initialDays={DEFAULT_DAYS} />
    </>
  );
}
