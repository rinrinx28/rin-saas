"use client";

import { ExternalLink, FileCheck2, FileText, Receipt } from "lucide-react";
import { useState } from "react";
import { issueEInvoiceAction } from "@/app/(app)/orders/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface EInvoiceRecord {
  status: string;
  series: string | null;
  invoice_no: string | null;
  tax_authority_code: string | null;
  lookup_url: string | null;
  issued_at: string | null;
}

// Panel HĐĐT trên trang chi tiết đơn. Hiển thị trạng thái + nút phát hành.
export function EInvoicePanel({
  orderId,
  einvoice,
  canManage,
}: {
  orderId: string;
  einvoice: EInvoiceRecord | null;
  canManage: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issued = einvoice?.status === "issued";

  async function issue() {
    setLoading(true);
    setError(null);
    const res = await issueEInvoiceAction(orderId);
    setLoading(false);
    if (res?.error) setError(res.error);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <Receipt className="size-4 text-fg-muted" /> Hóa đơn điện tử
          </span>
          {issued ? (
            <Badge variant="success">Đã phát hành</Badge>
          ) : (
            <Badge variant="neutral">Chưa phát hành</Badge>
          )}
        </div>

        {issued && einvoice ? (
          <div className="space-y-2 border-t border-border pt-3">
            <Row label="Ký hiệu" value={einvoice.series ?? "—"} />
            <Row label="Số hóa đơn" value={einvoice.invoice_no ?? "—"} mono />
            <Row label="Mã CQT" value={einvoice.tax_authority_code ?? "—"} mono />
            {einvoice.issued_at && (
              <Row
                label="Phát hành lúc"
                value={new Date(einvoice.issued_at).toLocaleString("vi-VN")}
              />
            )}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`/print/einvoice/${orderId}`} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-4" /> Xem HĐĐT
                </a>
              </Button>
              {einvoice.lookup_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={einvoice.lookup_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> Tra cứu
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-fg-muted">
              Phát hành HĐĐT có mã của cơ quan thuế cho đơn hàng này.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-danger"
              >
                {error}
              </p>
            )}
            {canManage ? (
              <Button className="w-full" loading={loading} onClick={issue}>
                <FileCheck2 className="size-4" /> Phát hành HĐĐT
              </Button>
            ) : (
              <p className="text-xs text-fg-subtle">
                Chỉ quản lý mới được phát hành HĐĐT.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className={mono ? "tnum text-right" : "text-right"}>{value}</span>
    </div>
  );
}
