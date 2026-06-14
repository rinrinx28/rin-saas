import { NextResponse } from "next/server";
import { reconcileWebhook } from "@/lib/payment/reconcile";

export const runtime = "nodejs";

// Webhook đối soát chuyển khoản theo tenant. ADR 0010.
// URL: /api/webhooks/bank/<provider>/<token> — provider gọi tới với secret riêng.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string; token: string }> },
) {
  const { provider, token } = await params;
  const apikey = request.headers.get("authorization") ?? request.headers.get("apikey");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await reconcileWebhook(provider, token, apikey, body);
  // SePay coi webhook thành công khi body có success: true (tránh gửi lại).
  return NextResponse.json(
    { success: result.httpStatus === 200, status: result.status },
    { status: result.httpStatus },
  );
}
