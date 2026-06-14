"use client";

import { Check, Copy, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { useState } from "react";
import {
  createIntegrationAction,
  deleteIntegrationAction,
  regenerateIntegrationSecretAction,
  toggleIntegrationAction,
} from "@/app/(app)/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Integration {
  id: string;
  store_id: string | null;
  provider: string;
  webhook_token: string;
  webhook_secret: string;
  enabled: boolean;
}
export interface StoreOpt {
  id: string;
  name: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:border-primary focus-visible:outline-none";

export function ReconciliationManager({
  integrations,
  stores,
  baseUrl,
}: {
  integrations: Integration[];
  stores: StoreOpt[];
  baseUrl: string;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          Kết nối SePay để tự đối soát chuyển khoản. Dán URL + secret vào cấu hình webhook trên SePay.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus /> Thêm tích hợp
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {integrations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <Webhook className="size-6 text-fg-subtle" />
          <p className="text-sm text-fg-muted">Chưa có tích hợp đối soát nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map((it) => (
            <IntegrationCard
              key={it.id}
              integration={it}
              baseUrl={baseUrl}
              scope={it.store_id ? (stores.find((s) => s.id === it.store_id)?.name ?? "Chi nhánh") : "Cửa hàng (mặc định)"}
              onError={setError}
            />
          ))}
        </div>
      )}

      <AddDialog open={adding} stores={stores} onClose={() => setAdding(false)} onError={setError} />
    </div>
  );
}

function IntegrationCard({
  integration: it,
  baseUrl,
  scope,
  onError,
}: {
  integration: Integration;
  baseUrl: string;
  scope: string;
  onError: (m: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const url = `${baseUrl}/api/webhooks/bank/${it.provider}/${it.webhook_token}`;

  async function run(fn: () => Promise<{ error?: string }>) {
    setBusy(true);
    onError(null);
    const res = await fn();
    setBusy(false);
    if (res?.error) onError(res.error);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="info">{it.provider.toUpperCase()}</Badge>
          <span className="text-sm font-medium">{scope}</span>
          {it.enabled ? (
            <Badge variant="success">Đang bật</Badge>
          ) : (
            <Badge variant="neutral">Đã tắt</Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            onClick={() => run(() => toggleIntegrationAction(it.id, !it.enabled))}
          >
            {it.enabled ? "Tắt" : "Bật"}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Đổi secret" disabled={busy} onClick={() => run(() => regenerateIntegrationSecretAction(it.id))}>
            <RefreshCw className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Xóa" disabled={busy} onClick={() => run(() => deleteIntegrationAction(it.id))}>
            <Trash2 className="size-4 text-danger" />
          </Button>
        </div>
      </div>

      <CopyField label="Webhook URL" value={url} />
      <CopyField label="Secret (Apikey)" value={it.webhook_secret} secret />
    </div>
  );
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!secret);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard bị chặn → bỏ qua
    }
  }

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={shown ? value : "•".repeat(Math.min(value.length, 24))}
          className="tnum text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        {secret && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShown((s) => !s)}>
            {shown ? "Ẩn" : "Hiện"}
          </Button>
        )}
        <Button type="button" variant="outline" size="icon" aria-label="Chép" onClick={copy}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function AddDialog({
  open,
  stores,
  onClose,
  onError,
}: {
  open: boolean;
  stores: StoreOpt[];
  onClose: () => void;
  onError: (m: string | null) => void;
}) {
  const [scope, setScope] = useState("org");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    onError(null);
    const storeId = scope === "org" ? null : scope;
    const res = await createIntegrationAction("sepay", storeId);
    setLoading(false);
    if (res?.error) onError(res.error);
    else {
      onClose();
      setScope("org");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm tích hợp đối soát</DialogTitle>
          <DialogDescription>Tạo webhook SePay cho cửa hàng hoặc một chi nhánh.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="scope">Áp dụng cho</Label>
            <select id="scope" className={selectClass} value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="org">Cửa hàng (mặc định)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  Chi nhánh: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={loading} onClick={submit}>
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
