"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { createPurchaseAction } from "@/app/(app)/purchases/actions";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyField, MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { formatVnd } from "@/lib/utils";
import { type PurchaseInput, purchaseSchema } from "@/lib/validations/purchase";

interface Store {
  id: string;
  name: string;
}
interface VariantOption {
  id: string;
  label: string;
  cost: number;
}
interface SupplierOption {
  id: string;
  name: string;
}

interface PurchaseFormProps {
  stores: Store[];
  variants: VariantOption[];
  suppliers: SupplierOption[];
  activeStoreId: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface";

export function PurchaseForm({ stores, variants, suppliers, activeStoreId }: PurchaseFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [paidStr, setPaidStr] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseInput>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      storeId: activeStoreId,
      supplierId: "",
      note: "",
      paid: 0,
      items: [{ variantId: "", qty: 1, cost: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const total = (watchedItems ?? []).reduce(
    (s, it) => s + (Number(it?.qty) || 0) * (Number(it?.cost) || 0),
    0,
  );
  const paidEntered = paidStr === "" ? total : Math.max(Number(paidStr) || 0, 0);
  const paidToOrder = Math.min(paidEntered, total);
  const debt = total - paidToOrder;
  const canSubmit = debt === 0 || supplierId !== "";

  async function onSubmit(values: PurchaseInput) {
    setServerError(null);
    if (!canSubmit) {
      setServerError("Chọn nhà cung cấp để ghi nợ phần còn thiếu");
      return;
    }
    const res = await createPurchaseAction({
      ...values,
      supplierId: supplierId || undefined,
      paid: paidToOrder,
    });
    if (res?.error) setServerError(res.error);
  }

  if (variants.length === 0) {
    return (
      <>
        <PageHeader title="Nhập hàng" />
        <Card>
          <CardContent className="p-6 text-sm text-fg-muted">
            Chưa có sản phẩm nào. Hãy tạo sản phẩm trước khi nhập hàng.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Phiếu nhập hàng" description="Nhập kho từ nhà cung cấp — tự cộng tồn." />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}

        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="storeId">Nhập vào chi nhánh</Label>
              <select id="storeId" className={selectClass} {...register("storeId")}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierId">Nhà cung cấp (tùy chọn)</Label>
              <select
                id="supplierId"
                className={selectClass}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">— Không chọn —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Field label="Ghi chú (tùy chọn)" htmlFor="note">
              <Input id="note" placeholder="Vd: nhập đợt T6" {...register("note")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <p className="font-medium">Dòng hàng</p>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ variantId: "", qty: 1, cost: 0 })}>
              <Plus /> Thêm dòng
            </Button>
          </div>
          <CardContent className="space-y-3 p-4">
            {errors.items?.message && <p className="text-sm text-danger">{errors.items.message}</p>}
            {fields.map((f, i) => (
              <div key={f.id} className="grid items-start gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor={`it-v-${i}`}>Sản phẩm</Label>
                  <select id={`it-v-${i}`} className={selectClass} {...register(`items.${i}.variantId`)}>
                    <option value="">— Chọn —</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                  {errors.items?.[i]?.variantId && (
                    <p className="text-xs text-danger">{errors.items[i]?.variantId?.message}</p>
                  )}
                </div>
                <Field label="Số lượng" htmlFor={`it-q-${i}`} error={errors.items?.[i]?.qty?.message}>
                  <Input id={`it-q-${i}`} type="number" min={1} className="tnum" {...register(`items.${i}.qty`, { valueAsNumber: true })} />
                </Field>
                <Field label="Giá vốn" htmlFor={`it-c-${i}`} error={errors.items?.[i]?.cost?.message}>
                  <MoneyField control={control} name={`items.${i}.cost`} id={`it-c-${i}`} />
                </Field>
                <div className="flex h-full items-end">
                  <Button type="button" variant="ghost" size="icon" aria-label="Xóa dòng" disabled={fields.length === 1} onClick={() => remove(i)}>
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="space-y-2 border-t border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-muted">Tổng tiền nhập</span>
              <span className="tnum text-lg font-semibold">{formatVnd(total)}</span>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm text-fg-muted">Đã trả NCC</span>
              <MoneyInput
                id="po-paid"
                suggest
                placeholder={total.toLocaleString("vi-VN")}
                value={paidStr === "" ? 0 : Number(paidStr)}
                onChange={(n) => setPaidStr(n === 0 ? "" : String(n))}
              />
            </div>
            {debt > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-danger">Ghi nợ NCC</span>
                <span className="tnum font-medium text-danger">{formatVnd(debt)}</span>
              </div>
            )}
            {debt > 0 && supplierId === "" && (
              <p className="text-xs text-warning">Chọn nhà cung cấp để ghi nợ phần còn thiếu.</p>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push("/purchases")}>Hủy</Button>
          <Button type="submit" loading={isSubmitting}>Tạo phiếu nhập</Button>
        </div>
      </form>
    </>
  );
}
