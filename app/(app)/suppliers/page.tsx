import { PageHeader } from "@/components/app-shell/page-header";
import { SupplierManager } from "@/components/suppliers/supplier-manager";
import { createClient } from "@/lib/supabase/server";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, phone, debt")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Nhà cung cấp" description="Danh sách NCC và công nợ phải trả." />
      <SupplierManager suppliers={suppliers ?? []} />
    </>
  );
}
