import { PageHeader } from "@/components/app-shell/page-header";
import { CustomerManager } from "@/components/customers/customer-manager";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, debt")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Khách hàng" description="Quản lý khách hàng và theo dõi công nợ phải thu." />
      <CustomerManager customers={customers ?? []} />
    </>
  );
}
