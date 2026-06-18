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
    supabase.from("organizations").select("id, name, plan, plan_expires_at, logo_url").order("created_at"),
    supabase.from("memberships").select("org_id, role").eq("user_id", user.id),
    supabase.from("stores").select("org_id"),
  ]);

  const roleByOrg = new Map((mems ?? []).map((m) => [m.org_id, m.role as string]));
  const branchByOrg = new Map<string, number>();
  for (const s of stores ?? []) {
    branchByOrg.set(s.org_id, (branchByOrg.get(s.org_id) ?? 0) + 1);
  }

  const shops: ShopVM[] = (orgs ?? []).map((o) => {
    const plan = effectivePlan(o.plan, o.plan_expires_at);
    return {
      id: o.id,
      name: o.name,
      role: roleByOrg.get(o.id) ?? "staff",
      plan,
      planName: PLANS[plan].name,
      branches: branchByOrg.get(o.id) ?? 0,
      logoUrl: o.logo_url ?? null,
    };
  });

  return (
    <div className="space-y-5">
      {shops.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">
            {shops.length} cửa hàng đã tham gia
          </p>
          <Button asChild>
            <Link href="/app/new">
              <Plus /> Tạo cửa hàng
            </Link>
          </Button>
        </div>
      )}
      <ShopList shops={shops} />
    </div>
  );
}
