"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptInviteAction, declineInviteAction, type MyInvite } from "@/app/(app)/invites/actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/roles";

// Hiển thị lời mời tham gia cửa hàng — đồng ý/từ chối. Người nhận luôn có quyền từ chối.
export function InvitePrompt({ invites }: { invites: MyInvite[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (invites.length === 0) return null;

  async function act(id: string, fn: (id: string) => Promise<{ error?: string }>) {
    setBusy(id);
    setError(null);
    const res = await fn(id);
    setBusy(null);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="font-medium">Bạn có {invites.length} lời mời tham gia cửa hàng</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      {invites.map((i) => (
        <div
          key={i.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{i.org_name}</p>
            <p className="text-sm text-fg-muted">
              {ROLE_LABEL[i.role] ?? i.role}
              {i.store_name ? ` · ${i.store_name}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={busy === i.id} onClick={() => act(i.id, declineInviteAction)}>
              Từ chối
            </Button>
            <Button loading={busy === i.id} onClick={() => act(i.id, acceptInviteAction)}>
              Đồng ý
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
