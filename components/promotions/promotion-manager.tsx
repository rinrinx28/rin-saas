"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPromotionAction,
  deletePromotionAction,
  togglePromotionAction,
} from "@/app/(app)/promotions/actions";
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
import { formatVnd } from "@/lib/utils";
import { PROMO_TYPE_LABEL } from "@/lib/validations/promotion";

export interface Promotion {
  id: string;
  name: string;
  code: string | null;
  type: "percent" | "amount";
  value: number;
  min_order: number;
  max_discount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface";

export function PromotionManager({
  promotions,
  canManage,
}: {
  promotions: Promotion[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[24rem_1fr]">
      {canManage && <PromotionForm />}
      <PromotionList promotions={promotions} canManage={canManage} />
    </div>
  );
}

function PromotionForm() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState(0);
  const [code, setCode] = useState("");
  const [minOrder, setMinOrder] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Nhập tên chương trình");
      return;
    }
    if (value <= 0 || (type === "percent" && value > 100)) {
      toast.error(type === "percent" ? "Phần trăm từ 1 đến 100" : "Nhập số tiền giảm");
      return;
    }
    setSubmitting(true);
    const res = await createPromotionAction({
      name: name.trim(),
      type,
      value,
      code: code.trim() || undefined,
      minOrder,
      maxDiscount: type === "percent" && maxDiscount > 0 ? maxDiscount : undefined,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      active: true,
    });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã tạo khuyến mãi");
    setName("");
    setValue(0);
    setCode("");
    setMinOrder(0);
    setMaxDiscount(0);
    setStartsAt("");
    setEndsAt("");
    router.refresh();
  }

  return (
    <Card className="h-fit">
      <CardContent className="space-y-4 p-5">
        <Field label="Tên chương trình" htmlFor="promo-name">
          <Input id="promo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Giảm giá cuối tuần" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hình thức" htmlFor="promo-type">
            <select
              id="promo-type"
              value={type}
              onChange={(e) => setType(e.target.value as "percent" | "amount")}
              className={selectClass}
            >
              <option value="percent">Giảm %</option>
              <option value="amount">Giảm tiền</option>
            </select>
          </Field>
          <Field label={type === "percent" ? "Phần trăm (%)" : "Số tiền giảm"} htmlFor="promo-value">
            {type === "percent" ? (
              <Input
                id="promo-value"
                inputMode="numeric"
                className="tnum"
                value={value || ""}
                onChange={(e) => setValue(Math.min(Number(e.target.value.replace(/\D/g, "")) || 0, 100))}
              />
            ) : (
              <MoneyInput id="promo-value" value={value} onChange={setValue} />
            )}
          </Field>
        </div>
        {type === "percent" && (
          <Field label="Trần giảm tối đa (tuỳ chọn)" htmlFor="promo-max">
            <MoneyInput id="promo-max" value={maxDiscount} onChange={setMaxDiscount} />
          </Field>
        )}
        <Field label="Mã coupon (để trống = tự áp mọi đơn)" htmlFor="promo-code">
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VD: HE2026"
          />
        </Field>
        <Field label="Đơn tối thiểu (tuỳ chọn)" htmlFor="promo-min">
          <MoneyInput id="promo-min" value={minOrder} onChange={setMinOrder} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bắt đầu (tuỳ chọn)" htmlFor="promo-start">
            <Input id="promo-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={selectClass} />
          </Field>
          <Field label="Kết thúc (tuỳ chọn)" htmlFor="promo-end">
            <Input id="promo-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={selectClass} />
          </Field>
        </div>
        <Button onClick={submit} loading={submitting} className="w-full">
          <Plus /> Tạo khuyến mãi
        </Button>
      </CardContent>
    </Card>
  );
}

function PromotionList({ promotions, canManage }: { promotions: Promotion[]; canManage: boolean }) {
  if (promotions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-fg-muted">Chưa có chương trình khuyến mãi.</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Chương trình</TableHead>
              <TableHead>Giảm</TableHead>
              <TableHead>Điều kiện</TableHead>
              <TableHead className="text-right">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((p) => (
              <PromotionRow key={p.id} promo={p} canManage={canManage} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PromotionRow({ promo, canManage }: { promo: Promotion; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await togglePromotionAction(promo.id, !promo.active);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await deletePromotionAction(promo.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã xoá khuyến mãi");
    router.refresh();
  }

  const cond: string[] = [];
  if (promo.min_order > 0) cond.push(`Đơn ≥ ${formatVnd(promo.min_order)}`);
  if (promo.max_discount) cond.push(`Trần ${formatVnd(promo.max_discount)}`);
  if (promo.ends_at) cond.push(`Đến ${new Date(promo.ends_at).toLocaleDateString("vi-VN")}`);

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{promo.name}</p>
        <p className="text-xs text-fg-muted">
          {promo.code ? (
            <span className="tnum font-medium text-primary">{promo.code}</span>
          ) : (
            "Tự áp mọi đơn"
          )}
          {" · "}
          {PROMO_TYPE_LABEL[promo.type]}
        </p>
      </TableCell>
      <TableCell className="tnum font-medium">
        {promo.type === "percent" ? `${promo.value}%` : formatVnd(promo.value)}
      </TableCell>
      <TableCell className="text-sm text-fg-muted">{cond.length ? cond.join(" · ") : "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {canManage ? (
            <>
              <Button variant={promo.active ? "outline" : "secondary"} size="sm" loading={busy} onClick={toggle}>
                {promo.active ? "Đang chạy" : "Tạm tắt"}
              </Button>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Xoá" disabled={busy} onClick={remove}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            </>
          ) : (
            <Badge variant={promo.active ? "success" : "neutral"}>
              {promo.active ? "Đang chạy" : "Tạm tắt"}
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
