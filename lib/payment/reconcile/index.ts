// Lõi đối soát: tra tích hợp theo token → verify secret → chuẩn hoá → RPC. ADR 0010.

import { createAdminClient } from "@/lib/supabase/admin";
import { sepayProvider } from "./sepay";
import type { ReconcileProvider } from "./types";

export * from "./types";

const PROVIDERS: Record<string, ReconcileProvider> = {
  sepay: sepayProvider,
};

export function getReconcileProvider(key: string): ReconcileProvider | null {
  return PROVIDERS[key] ?? null;
}

// Trích mã đơn (HD + 12 chữ số) từ nội dung CK, đã chuẩn hoá (UPPER, chỉ A-Z0-9).
export function extractOrderCodeNorm(content: string): string {
  const norm = (content ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = norm.match(/HD\d{12}/);
  return m ? m[0] : "";
}

export interface ReconcileOutcome {
  httpStatus: number;
  status: string;
}

export async function reconcileWebhook(
  providerKey: string,
  token: string,
  apikeyHeader: string | null,
  body: unknown,
): Promise<ReconcileOutcome> {
  const provider = getReconcileProvider(providerKey);
  if (!provider) return { httpStatus: 404, status: "unknown_provider" };

  const admin = createAdminClient();
  const { data: integ } = await admin
    .from("payment_integrations")
    .select("id, webhook_secret, enabled")
    .eq("webhook_token", token)
    .eq("provider", providerKey)
    .maybeSingle();
  if (!integ || !integ.enabled) return { httpStatus: 404, status: "no_integration" };

  if (!provider.verify(apikeyHeader, integ.webhook_secret)) {
    return { httpStatus: 401, status: "unauthorized" };
  }

  const txn = provider.parse(body);
  // Payload không phải tiền vào / lạ → 200 để provider không gửi lại.
  if (!txn) return { httpStatus: 200, status: "ignored" };

  const codeNorm = extractOrderCodeNorm(txn.content);
  const { data, error } = await admin.rpc("reconcile_transfer", {
    p_integration: integ.id,
    p_external_id: txn.externalId,
    p_amount: txn.amount,
    p_account: txn.account,
    p_content: txn.content,
    p_code_norm: codeNorm,
    p_raw: body as object,
  });
  if (error) return { httpStatus: 500, status: "rpc_error" };
  return { httpStatus: 200, status: (data as { status: string }).status };
}
