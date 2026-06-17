"use client";

import { ArrowDownLeft, ArrowUpRight, Clock, Lock, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeShiftAction, openShiftAction } from "@/app/(app)/shifts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatVnd } from "@/lib/utils";
import { CASH_DENOMINATIONS, type OpeningMode } from "@/lib/validations/shift";

export interface ShiftSummary {
  opening: number;
  sales_cash: number;
  cash_in: number;
  cash_out: number;
  expected: number;
}

export interface ShiftDefinition {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
}

interface OpenShift {
  id: string;
  opened_at: string;
  opening_cash: number;
  shift_name: string | null;
  opening_mode: string | null;
  note: string | null;
  summary: ShiftSummary;
}

interface ClosedShift {
  id: string;
  opened_at: string;
  closed_at: string | null;
  shift_name: string | null;
  opening_cash: number;
  expected_cash: number | null;
  closing_cash_counted: number | null;
  diff: number | null;
}

interface ShiftManagerProps {
  storeId: string;
  open: OpenShift | null;
  history: ClosedShift[];
  definitions: ShiftDefinition[];
  openingMode: OpeningMode;
  fixedFloat: number;
  lastClosing: number;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function ShiftManager({
  storeId,
  open,
  history,
  definitions,
  openingMode,
  fixedFloat,
  lastClosing,
}: ShiftManagerProps) {
  return (
    <div className="space-y-6">
      {open ? (
        <OpenShiftCard shift={open} />
      ) : (
        <OpenShiftForm
          storeId={storeId}
          definitions={definitions}
          openingMode={openingMode}
          fixedFloat={fixedFloat}
          lastClosing={lastClosing}
        />
      )}
      <ShiftHistory history={history} />
    </div>
  );
}

function OpenShiftForm({
  storeId,
  definitions,
  openingMode,
  fixedFloat,
  lastClosing,
}: {
  storeId: string;
  definitions: ShiftDefinition[];
  openingMode: OpeningMode;
  fixedFloat: number;
  lastClosing: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [definitionId, setDefinitionId] = useState(definitions[0]?.id ?? "");
  const [openingCash, setOpeningCash] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const autoOpening = openingMode === "carry" ? lastClosing : openingMode === "fixed" ? fixedFloat : 0;

  async function submit() {
    setSubmitting(true);
    const res = await openShiftAction({
      storeId,
      definitionId: definitionId || undefined,
      openingCash: openingMode === "manual" ? openingCash : 0,
      note: note || undefined,
    });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã mở ca");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-fg-muted">
          <Clock className="size-5" />
          <span>Chưa có ca nào đang mở tại chi nhánh này.</span>
        </div>
        <div className="grid gap-4 sm:max-w-md">
          {definitions.length > 0 && (
            <Field label="Chọn ca" htmlFor="def">
              <select
                id="def"
                value={definitionId}
                onChange={(e) => setDefinitionId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface"
              >
                {definitions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.start_time && d.end_time ? ` (${hhmm(d.start_time)}–${hhmm(d.end_time)})` : ""}
                  </option>
                ))}
                <option value="">Khác (không gắn ca)</option>
              </select>
            </Field>
          )}

          {openingMode === "manual" ? (
            <Field label="Tiền mặt đầu ca" htmlFor="opening">
              <MoneyInput id="opening" value={openingCash} onChange={setOpeningCash} suggest />
            </Field>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
              <span className="text-sm text-fg-muted">
                Tiền đầu ca {openingMode === "carry" ? "(cuốn chiếu từ ca trước)" : "(định mức)"}
              </span>
              <span className="tnum font-semibold">{formatVnd(autoOpening)}</span>
            </div>
          )}

          <Field label="Ghi chú (tuỳ chọn)" htmlFor="note">
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ca sáng…" />
          </Field>
        </div>
        <Button onClick={submit} loading={submitting}>
          <Clock /> Mở ca
        </Button>
      </CardContent>
    </Card>
  );
}

function OpenShiftCard({ shift }: { shift: OpenShift }) {
  const s = shift.summary;
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="success">Đang mở</Badge>
            {shift.shift_name && <span className="font-medium">{shift.shift_name}</span>}
            <span className="text-sm text-fg-muted">
              Mở lúc {new Date(shift.opened_at).toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/cash">
                <Wallet /> Thu / Chi
              </Link>
            </Button>
            <CloseShiftDialog shiftId={shift.id} expected={s.expected} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Đầu ca" value={s.opening} />
          <Stat label="Bán tiền mặt" value={s.sales_cash} tone="up" />
          <Stat label="Thu khác" value={s.cash_in} tone="up" />
          <Stat label="Chi khác" value={s.cash_out} tone="down" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
          <span className="font-medium">Tiền mặt kỳ vọng trong két</span>
          <span className="tnum text-lg font-semibold text-primary">{formatVnd(s.expected)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <p className="text-xs text-fg-muted">{label}</p>
      <p
        className={`tnum mt-0.5 text-lg font-semibold ${
          tone === "up" ? "text-success" : tone === "down" ? "text-danger" : ""
        }`}
      >
        {tone === "up" ? "+" : tone === "down" ? "−" : ""}
        {formatVnd(value)}
      </p>
    </div>
  );
}

function CloseShiftDialog({ shiftId, expected }: { shiftId: string; expected: number }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [byDenom, setByDenom] = useState(false);
  const [counted, setCounted] = useState(0);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const denomTotal = CASH_DENOMINATIONS.reduce((s, d) => s + d * (qty[d] || 0), 0);
  const effectiveCounted = byDenom ? denomTotal : counted;
  const diff = effectiveCounted - expected;

  async function submit() {
    setSubmitting(true);
    const breakdown = byDenom
      ? Object.fromEntries(CASH_DENOMINATIONS.filter((d) => qty[d] > 0).map((d) => [String(d), qty[d]]))
      : undefined;
    const res = await closeShiftAction({ shiftId, counted: effectiveCounted, breakdown, note: note || undefined });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    const d = res.summary!.diff;
    toast.success(
      d === 0 ? "Chốt ca: khớp quỹ" : d > 0 ? `Chốt ca: thừa ${formatVnd(d)}` : `Chốt ca: thiếu ${formatVnd(-d)}`,
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Lock /> Chốt ca
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chốt ca</DialogTitle>
          <DialogDescription>
            Đếm tiền mặt thực tế trong két, hệ thống đối chiếu với số kỳ vọng.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Kỳ vọng</span>
            <span className="tnum font-medium">{formatVnd(expected)}</span>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={byDenom}
              onChange={(e) => setByDenom(e.target.checked)}
              className="size-4 accent-primary"
            />
            Đếm theo mệnh giá
          </label>

          {byDenom ? (
            <div className="space-y-1.5">
              {CASH_DENOMINATIONS.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="tnum w-24 text-sm text-fg-muted">{formatVnd(d)}</span>
                  <span className="text-fg-subtle">×</span>
                  <Input
                    inputMode="numeric"
                    className="tnum h-8 w-20"
                    value={qty[d] || ""}
                    onChange={(e) =>
                      setQty((q) => ({ ...q, [d]: Number(e.target.value.replace(/\D/g, "")) || 0 }))
                    }
                  />
                  <span className="tnum ml-auto text-sm">{formatVnd(d * (qty[d] || 0))}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="font-medium">Tổng đếm</span>
                <span className="tnum font-semibold">{formatVnd(denomTotal)}</span>
              </div>
            </div>
          ) : (
            <Field label="Tiền mặt thực đếm" htmlFor="counted">
              <MoneyInput id="counted" value={counted} onChange={setCounted} suggest />
            </Field>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Lệch quỹ</span>
            <span
              className={`tnum font-semibold ${diff === 0 ? "" : diff > 0 ? "text-success" : "text-danger"}`}
            >
              {diff > 0 ? "+" : diff < 0 ? "−" : ""}
              {formatVnd(Math.abs(diff))}
            </span>
          </div>
          <Field label="Ghi chú (tuỳ chọn)" htmlFor="close-note">
            <Input id="close-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} loading={submitting}>
            Xác nhận chốt ca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShiftHistory({ history }: { history: ClosedShift[] }) {
  if (history.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Ca</TableHead>
              <TableHead>Chốt lúc</TableHead>
              <TableHead className="text-right">Kỳ vọng</TableHead>
              <TableHead className="text-right">Thực đếm</TableHead>
              <TableHead className="text-right">Lệch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => {
              const diff = h.diff ?? 0;
              return (
                <TableRow key={h.id}>
                  <TableCell>
                    <p className="font-medium">{h.shift_name ?? "Ca tự do"}</p>
                    <p className="text-xs text-fg-muted">{new Date(h.opened_at).toLocaleString("vi-VN")}</p>
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">
                    {h.closed_at ? new Date(h.closed_at).toLocaleString("vi-VN") : "—"}
                  </TableCell>
                  <TableCell className="tnum text-right">{formatVnd(h.expected_cash ?? 0)}</TableCell>
                  <TableCell className="tnum text-right">{formatVnd(h.closing_cash_counted ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={diff === 0 ? "neutral" : diff > 0 ? "success" : "danger"}>
                      <span className="inline-flex items-center gap-0.5">
                        {diff > 0 ? <ArrowUpRight /> : diff < 0 ? <ArrowDownLeft /> : null}
                        {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                        {formatVnd(Math.abs(diff))}
                      </span>
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
