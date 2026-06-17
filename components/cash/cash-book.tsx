"use client";

import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordCashAction } from "@/app/(app)/shifts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { CASH_CATEGORY_LABEL } from "@/lib/validations/cash";
import { formatVnd } from "@/lib/utils";

export interface CashEntry {
  id: string;
  direction: "in" | "out";
  category: string;
  amount: number;
  note: string | null;
  created_at: string;
  shift_id: string | null;
}

type Direction = "in" | "out";

const CATEGORIES: Record<Direction, { value: string; label: string }[]> = {
  in: [
    { value: "thu_khac", label: "Thu khác" },
    { value: "von", label: "Góp vốn" },
    { value: "thu_no", label: "Thu nợ" },
  ],
  out: [
    { value: "chi_khac", label: "Chi khác" },
    { value: "luong", label: "Ứng/Trả lương" },
    { value: "dien_nuoc", label: "Điện nước" },
    { value: "rut", label: "Rút quỹ" },
  ],
};

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface";

export function CashBook({
  storeId,
  hasOpenShift,
  entries,
}: {
  storeId: string;
  hasOpenShift: boolean;
  entries: CashEntry[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [direction, setDirection] = useState<Direction>("in");
  const [category, setCategory] = useState("thu_khac");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchDirection(d: Direction) {
    setDirection(d);
    setCategory(CATEGORIES[d][0].value);
  }

  async function submit() {
    if (amount <= 0) {
      toast.error("Nhập số tiền");
      return;
    }
    setSubmitting(true);
    const res = await recordCashAction({ storeId, direction, category, amount, note: note || undefined });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(direction === "in" ? "Đã ghi phiếu thu" : "Đã ghi phiếu chi");
    setAmount(0);
    setNote("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit">
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchDirection("in")}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                direction === "in"
                  ? "border-success bg-success-bg text-success"
                  : "border-border text-fg-muted hover:bg-surface-2"
              }`}
            >
              <ArrowUpCircle className="size-4" /> Phiếu thu
            </button>
            <button
              type="button"
              onClick={() => switchDirection("out")}
              className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                direction === "out"
                  ? "border-danger bg-danger-bg text-danger"
                  : "border-border text-fg-muted hover:bg-surface-2"
              }`}
            >
              <ArrowDownCircle className="size-4" /> Phiếu chi
            </button>
          </div>

          <Field label="Loại" htmlFor="cat">
            <select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              {CATEGORIES[direction].map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Số tiền" htmlFor="amount">
            <MoneyInput id="amount" value={amount} onChange={setAmount} suggest />
          </Field>
          <Field label="Ghi chú (tuỳ chọn)" htmlFor="cash-note">
            <Input id="cash-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>

          {!hasOpenShift && (
            <p className="text-xs text-fg-muted">
              Chưa có ca mở — phiếu vẫn được ghi nhưng không tính vào đối chiếu ca.
            </p>
          )}
          <Button onClick={submit} loading={submitting} className="w-full">
            Ghi phiếu
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-8 text-center text-fg-muted">Chưa có phiếu quỹ nào.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm text-fg-muted">
                      {new Date(e.created_at).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.direction === "in" ? "success" : "danger"}>
                        {CASH_CATEGORY_LABEL[e.category] ?? e.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-50 truncate text-sm text-fg-muted">{e.note ?? "—"}</TableCell>
                    <TableCell
                      className={`tnum text-right font-medium ${
                        e.direction === "in" ? "text-success" : "text-danger"
                      }`}
                    >
                      {e.direction === "in" ? "+" : "−"}
                      {formatVnd(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
