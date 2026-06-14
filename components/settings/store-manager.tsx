"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  createStoreAction,
  deleteStoreAction,
  updateStoreAction,
} from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BankIcon } from "@/components/payment/bank-icon";
import { BankSelect } from "@/components/payment/bank-select";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findBank } from "@/lib/payment/vn-banks";
import { type StoreInput, storeSchema } from "@/lib/validations/settings";

interface StoreRow {
  id: string;
  name: string;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
}

export function StoreManager({ stores }: { stores: StoreRow[] }) {
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<StoreRow | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-fg-muted">{stores.length} chi nhánh</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Thêm chi nhánh
        </Button>
      </div>

      {stores.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <Store className="size-5" />
          </div>
          <p className="font-medium">Chưa có chi nhánh</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên chi nhánh</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Tài khoản nhận tiền</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-fg-muted">{s.address ?? "—"}</TableCell>
                <TableCell className="text-fg-muted">
                  {s.bank_account ? (
                    <span className="inline-flex items-center gap-1.5">
                      {findBank(s.bank_name) && <BankIcon bank={findBank(s.bank_name)!} size="sm" />}
                      <span className="tnum">{s.bank_account}</span>
                      {s.bank_name ? <span className="text-xs">· {s.bank_name}</span> : null}
                    </span>
                  ) : (
                    <span className="text-fg-subtle">Theo cửa hàng</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Sửa" onClick={() => setEditing(s)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Xóa" onClick={() => setDeleting(s)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <StoreFormDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        store={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <DeleteDialog store={deleting} onClose={() => setDeleting(null)} />
    </Card>
  );
}

function StoreFormDialog({
  open,
  store,
  onClose,
}: {
  open: boolean;
  store: StoreRow | null;
  onClose: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    values: {
      name: store?.name ?? "",
      address: store?.address ?? "",
      bankName: store?.bank_name ?? "",
      bankAccount: store?.bank_account ?? "",
      bankHolder: store?.bank_holder ?? "",
    },
  });

  // State khởi tạo theo store; dialog được remount qua `key` khi đổi chi nhánh.
  const [bankName, setBankName] = useState(store?.bank_name ?? "");

  async function onSubmit(values: StoreInput) {
    setServerError(null);
    const res = store
      ? await updateStoreAction(store.id, values)
      : await createStoreAction(values);
    if (res?.error) setServerError(res.error);
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{store ? "Sửa chi nhánh" : "Thêm chi nhánh"}</DialogTitle>
          <DialogDescription>Thông tin chi nhánh.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Field label="Tên chi nhánh" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="Chi nhánh Quận 1" {...register("name")} />
          </Field>
          <Field label="Địa chỉ (tùy chọn)" htmlFor="address">
            <Input id="address" placeholder="123 Lê Lợi, Q1" {...register("address")} />
          </Field>

          <div className="space-y-3 rounded-md border border-border bg-surface-2 p-3">
            <p className="text-xs text-fg-muted">
              Tài khoản nhận tiền riêng cho chi nhánh (để trống = dùng tài khoản cửa hàng).
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Ngân hàng</Label>
              <BankSelect
                id="bankName"
                value={bankName}
                onChange={(v) => {
                  setBankName(v);
                  setValue("bankName", v, { shouldDirty: true });
                }}
              />
            </div>
            <Field label="Số tài khoản" htmlFor="bankAccount" error={errors.bankAccount?.message}>
              <Input id="bankAccount" placeholder="0123456789" {...register("bankAccount")} />
            </Field>
            <Field label="Chủ tài khoản" htmlFor="bankHolder" error={errors.bankHolder?.message}>
              <Input id="bankHolder" placeholder="NGUYEN VAN A" {...register("bankHolder")} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={isSubmitting}>{store ? "Lưu" : "Tạo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ store, onClose }: { store: StoreRow | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!store) return;
    setLoading(true);
    setError(null);
    const res = await deleteStoreAction(store.id);
    setLoading(false);
    if (res?.error) setError(res.error);
    else onClose();
  }

  return (
    <Dialog open={store !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa chi nhánh?</DialogTitle>
          <DialogDescription>Xóa “{store?.name}”. Không thể hoàn tác.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="destructive" loading={loading} onClick={confirm}>Xóa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
