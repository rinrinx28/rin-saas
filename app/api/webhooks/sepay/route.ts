import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/billing/activate";

// Webhook SePay: nhận thông báo giao dịch chuyển khoản đến → đối soát theo memo.
// SePay gọi với header: Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>
// Payload (rút gọn): { transferType: "in", transferAmount: number, content: string }
export async function POST(request: Request) {
  const key = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!key || request.headers.get("authorization") !== `Apikey ${key}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Chỉ xử lý tiền vào
  if (body.transferType && body.transferType !== "in") {
    return NextResponse.json({ ok: true, note: "ignored_non_in" });
  }

  // SePay tự tách "code" nếu cấu hình tiền tố mã; nếu không, dò trong content.
  const content = String(body.content ?? "");
  const rawCode = body.code ? String(body.code) : content.match(/RIN[A-Z0-9]+/i)?.[0];
  if (!rawCode) return NextResponse.json({ ok: true, note: "no_memo" });

  const amount = Number(body.transferAmount ?? 0);
  const result = await confirmPayment(rawCode.toUpperCase(), amount);

  return NextResponse.json({ ok: result.ok, reason: result.reason });
}
