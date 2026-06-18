import { MailOpen } from "lucide-react";
import type { MyInvite } from "@/app/(app)/invites/actions";
import { InvitePrompt } from "@/components/app-shell/invite-prompt";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Hub → Lời mời tham gia cửa hàng. ADR 0015 (dùng lại luồng accept/decline ADR 0011).
export default async function HubInvitesPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_invites_for_me");
  const invites = (data as MyInvite[] | null) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Lời mời</h1>
        <p className="text-sm text-fg-muted">Lời mời tham gia cửa hàng đang chờ bạn phản hồi.</p>
      </div>

      {invites.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
            <MailOpen className="size-6" />
          </span>
          <p className="text-sm text-fg-muted">Không có lời mời nào đang chờ.</p>
        </Card>
      ) : (
        <InvitePrompt invites={invites} />
      )}
    </div>
  );
}
