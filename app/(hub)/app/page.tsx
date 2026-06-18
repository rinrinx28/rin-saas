import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShopList, type ShopVM } from "@/components/hub/shop-list";
import { Button } from "@/components/ui/button";
import { effectivePlan, PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

// Hub → Cửa hàng đã tham gia. ADR 0015.
export default async function ShopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS chỉ trả org/chi nhánh mà user là thành viên.
  const [{ data: orgs }, { data: mems }, { data: stores }] = await Promise.all([
    supabase.from("organizations").select("id, name, plan, plan_expires_at").order("created_at"),
    supabase.from("memberships").select("org_id, role").eq("user_id", user.id),
    supabase.from("stores").select("org_id"),
  ]);

  const roleByOrg = new Map((mems ?? []).map((m) => [m.org_id, m.role as string]));
  const branchByOrg = new Map<string, number>();
  for (const s of stores ?? []) {
    branchByOrg.set(s.org_id, (branchByOrg.get(s.org_id) ?? 0) + 1);
  }

  const shops: ShopVM[] = (orgs ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    role: roleByOrg.get(o.id) ?? "staff",
    planName: PLANS[effectivePlan(o.plan, o.plan_expires_at)].name,
    branches: branchByOrg.get(o.id) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Cửa hàng của bạn</h1>
          <p className="text-sm text-fg-muted">Chọn một cửa hàng để vào quản lý.</p>
        </div>
        {shops.length > 0 && (
          <Button asChild>
            <Link href="/app/new">
              <Plus /> Tạo cửa hàng
            </Link>
          </Button>
        )}
      </div>
      <ShopList shops={shops} />
    </div>
  );
}
