"use client";

import { Clock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createShiftDefinitionAction,
  deleteShiftDefinitionAction,
  updateShiftConfigAction,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import { OPENING_MODE_LABEL, type OpeningMode } from "@/lib/validations/shift";

export interface ShiftDef {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  store_id: string | null;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface";

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function ShiftSettings({
  config,
  orgDefs,
  storeDefs,
  storeName,
}: {
  config: { openingMode: OpeningMode; fixedFloat: number };
  orgDefs: ShiftDef[];
  storeDefs: ShiftDef[];
  storeName: string;
}) {
  return (
    <div className="space-y-4">
      <OpeningModeCard config={config} />
      <DefinitionsCard orgDefs={orgDefs} storeDefs={storeDefs} storeName={storeName} />
    </div>
  );
}

function OpeningModeCard({ config }: { config: { openingMode: OpeningMode; fixedFloat: number } }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<OpeningMode>(config.openingMode);
  const [fixedFloat, setFixedFloat] = useState(config.fixedFloat);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await updateShiftConfigAction({ openingMode: mode, fixedFloat });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã lưu cấu hình ca");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <Field label="Tiền đầu ca" htmlFor="opening-mode">
            <select
              id="opening-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as OpeningMode)}
              className={selectClass}
            >
              {(Object.keys(OPENING_MODE_LABEL) as OpeningMode[]).map((m) => (
                <option key={m} value={m}>
                  {OPENING_MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
          {mode === "fixed" && (
            <Field label="Định mức quỹ lẻ" htmlFor="fixed-float">
              <MoneyInput id="fixed-float" value={fixedFloat} onChange={setFixedFloat} suggest />
            </Field>
          )}
        </div>
        <p className="text-xs text-fg-muted">
          {mode === "carry" && "Đầu ca tự lấy bằng tiền đếm cuối ca trước (tiền ở lại trong két)."}
          {mode === "fixed" && "Đầu ca luôn bằng định mức quỹ lẻ; cuối ca nộp phần dư về két chính."}
          {mode === "manual" && "Thu ngân tự nhập tiền đầu ca mỗi lần mở ca."}
        </p>
        <Button onClick={submit} loading={submitting}>
          Lưu cấu hình
        </Button>
      </CardContent>
    </Card>
  );
}

function DefinitionsCard({
  orgDefs,
  storeDefs,
  storeName,
}: {
  orgDefs: ShiftDef[];
  storeDefs: ShiftDef[];
  storeName: string;
}) {
  const [scope, setScope] = useState<"org" | "store">("org");
  const defs = scope === "org" ? orgDefs : storeDefs;
  const inheriting = scope === "store" && storeDefs.length === 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
          {(["org", "store"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                scope === s ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              {s === "org" ? "Toàn cửa hàng" : `Chi nhánh ${storeName}`}
            </button>
          ))}
        </div>

        {inheriting && (
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg-muted">
            Chi nhánh đang <b>kế thừa</b> bộ ca của cửa hàng. Tạo ca riêng bên dưới để <b>ghi đè</b> cho riêng chi nhánh này.
          </p>
        )}

        <ul className="divide-y divide-border">
          {defs.length === 0 && !inheriting && (
            <li className="py-3 text-sm text-fg-muted">Chưa có ca nào.</li>
          )}
          {defs.map((d) => (
            <DefRow key={d.id} def={d} />
          ))}
        </ul>

        <AddDefForm scope={scope} />
      </CardContent>
    </Card>
  );
}

function DefRow({ def }: { def: ShiftDef }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await deleteShiftDefinitionAction(def.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  const range = def.start_time && def.end_time ? `${hhmm(def.start_time)}–${hhmm(def.end_time)}` : "Không cố định giờ";

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="inline-flex items-center gap-2">
        <Clock className="size-4 text-fg-subtle" />
        <span className="font-medium">{def.name}</span>
        <span className="tnum text-xs text-fg-muted">{range}</span>
      </span>
      <Button variant="ghost" size="icon" className="size-8" aria-label="Xoá" disabled={busy} onClick={remove}>
        <Trash2 className="size-4 text-danger" />
      </Button>
    </li>
  );
}

function AddDefForm({ scope }: { scope: "org" | "store" }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Nhập tên ca");
      return;
    }
    setBusy(true);
    const res = await createShiftDefinitionAction({ scope, name: name.trim(), startTime: start, endTime: end });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã thêm ca");
    setName("");
    setStart("");
    setEnd("");
    router.refresh();
  }

  return (
    <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_auto_auto_auto]">
      <Input placeholder="Tên ca (VD: Ca sáng)" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
      <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${selectClass} sm:w-32`} aria-label="Giờ bắt đầu" />
      <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${selectClass} sm:w-32`} aria-label="Giờ kết thúc" />
      <Button size="sm" loading={busy} onClick={submit}>
        <Plus /> Thêm
      </Button>
    </div>
  );
}
