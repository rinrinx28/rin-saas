import { Boxes } from "lucide-react";
import { redirect } from "next/navigation";
import type { MyInvite } from "@/app/(app)/invites/actions";
import { InvitePrompt } from "@/components/app-shell/invite-prompt";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Đã thuộc cửa hàng nào đó → vào quản lý luôn.
  const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
  if (orgs && orgs.length > 0) redirect("/dashboard");

  // Lời mời gửi cho email này (nếu có) — đồng ý để vào, hoặc tạo cửa hàng mới.
  const { data: invitesData } = await supabase.rpc("list_invites_for_me");
  const invites = (invitesData as MyInvite[] | null) ?? [];

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Boxes className="size-6 text-primary" />
          <span className="font-display text-xl font-semibold tracking-tight">rin·saas</span>
        </div>

        {invites.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Bạn được mời tham gia cửa hàng</p>
            <InvitePrompt invites={invites} />
            <p className="text-center text-sm text-fg-muted">Hoặc tạo cửa hàng của riêng bạn:</p>
          </div>
        )}

        <OnboardingForm />
      </div>
    </main>
  );
}
