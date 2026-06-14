"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Factory, HandCoins, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  createSupplierAction,
  deleteSupplierAction,
  paySupplierDebtAction,
  updateSupplierAction,
} from "@/app/(app)/suppliers/actions";
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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatVnd } from "@/lib/utils";
import { type SupplierInput, supplierSchema } from "@/lib/validations/supplier";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
}

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [paying, setPaying] = useState<Supplier | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-fg-muted">{suppliers.length} nhà cung cấp</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Thêm NCC
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <Factory className="size-5" />
          </div>
          <p className="font-medium">Chưa có nhà cung cấp</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead className="text-right">Công nợ phải trả</TableHead>
              <TableHead className="w-32 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="tnum text-fg-muted">{s.phone ?? "—"}</TableCell>
                <TableCell className={cn("tnum text-right", s.debt > 0 ? "font-medium text-danger" : "text-fg-muted")}>
                  {formatVnd(s.debt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {s.debt > 0 && (
                      <Button variant="ghost" size="icon" aria-label="Trả nợ" onClick={() => setPaying(s)}>
                        <HandCoins className="size-4 text-success" />
                      </Button>
                    )}
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

      <SupplierFormDialog
        open={creating || editing !== null}
        supplier={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <PayDialog supplier={paying} onClose={() => setPaying(null)} />
      <DeleteDialog supplier={deleting} onClose={() => setDeleting(null)} />
    </Card>
  );
}

function SupplierFormDialog({
  open,
  supplier,
  onClose,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    values: { name: supplier?.name ?? "", phone: supplier?.phone ?? "" },
  });

  async function onSubmit(values: SupplierInput) {
    setServerError(null);
    const res = supplier
      ? await updateSupplierAction(supplier.id, values)
      : await createSupplierAction(values);
    if (res?.error) setServerError(res.error);
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}</DialogTitle>
          <DialogDescription>Thông tin nhà cung cấp.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Field label="Tên nhà cung cấp" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="Công ty ABC" {...register("name")} />
          </Field>
          <Field label="Điện thoại (tùy chọn)" htmlFor="phone">
            <Input id="phone" placeholder="09xxxxxxxx" {...register("phone")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={isSubmitting}>{supplier ? "Lưu" : "Tạo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!supplier) return;
    const value = Number(amount || supplier.debt);
    setLoading(true);
    setError(null);
    const res = await paySupplierDebtAction(supplier.id, value);
    setLoading(false);
    if (res?.error) setError(res.error);
    else {
      setAmount("");
      onClose();
    }
  }

  return (
    <Dialog open={supplier !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trả nợ nhà cung cấp</DialogTitle>
          <DialogDescription>
            Đang nợ {supplier?.name}: {supplier ? formatVnd(supplier.debt) : ""}.
          </DialogDescription>
        </DialogHeader>
        <Field label="Số tiền trả" htmlFor="amount" error={error ?? undefined}>
          <Input
            id="amount"
            type="number"
            min={0}
            placeholder={String(supplier?.debt ?? 0)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tnum"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          <Button loading={loading} onClick={confirm}>Xác nhận trả</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!supplier) return;
    setLoading(true);
    setError(null);
    const res = await deleteSupplierAction(supplier.id);
    setLoading(false);
    if (res?.error) setError(res.error);
    else onClose();
  }

  return (
    <Dialog open={supplier !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa nhà cung cấp?</DialogTitle>
          <DialogDescription>Xóa “{supplier?.name}”. Không thể hoàn tác.</DialogDescription>
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
