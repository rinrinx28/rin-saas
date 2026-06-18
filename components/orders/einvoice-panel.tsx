"use client";

import { Construction, ExternalLink, FileText, Receipt } from "lucide-react";
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

// Panel HĐĐT trên trang chi tiết đơn.
// Tính năng đang phát triển — tạm ẩn nút phát hành (xem .claude/docs/0009).
export function EInvoicePanel({
  orderId,
  einvoice,
}: {
  orderId: string;
  einvoice: EInvoiceRecord | null;
  canManage: boolean;
}) {
  const issued = einvoice?.status === "issued";

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
            <Badge variant="info">
              <Construction /> Đang phát triển
            </Badge>
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
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-fg-muted">
              Phát hành hóa đơn điện tử có mã của cơ quan thuế đang được phát triển và sẽ sớm ra
              mắt.
            </p>
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
