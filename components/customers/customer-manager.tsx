"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HandCoins, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  collectDebtAction,
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/app/(app)/customers/actions";
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
import { type CustomerInput, customerSchema } from "@/lib/validations/customer";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  debt: number;
}

export function CustomerManager({ customers }: { customers: Customer[] }) {
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [collecting, setCollecting] = useState<Customer | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-fg-muted">{customers.length} khách hàng</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Thêm khách hàng
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <Users className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Chưa có khách hàng</p>
            <p className="text-sm text-fg-muted">Thêm khách để theo dõi công nợ.</p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead className="text-right">Công nợ</TableHead>
              <TableHead className="w-32 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="tnum text-fg-muted">{c.phone ?? "—"}</TableCell>
                <TableCell className={cn("tnum text-right", c.debt > 0 ? "font-medium text-danger" : "text-fg-muted")}>
                  {formatVnd(c.debt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {c.debt > 0 && (
                      <Button variant="ghost" size="icon" aria-label="Thu nợ" onClick={() => setCollecting(c)}>
                        <HandCoins className="size-4 text-success" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label="Sửa" onClick={() => setEditing(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Xóa" onClick={() => setDeleting(c)}>
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CustomerFormDialog
        open={creating || editing !== null}
        customer={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <CollectDialog customer={collecting} onClose={() => setCollecting(null)} />
      <DeleteDialog customer={deleting} onClose={() => setDeleting(null)} />
    </Card>
  );
}

function CustomerFormDialog({
  open,
  customer,
  onClose,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    values: { name: customer?.name ?? "", phone: customer?.phone ?? "" },
  });

  async function onSubmit(values: CustomerInput) {
    setServerError(null);
    const res = customer
      ? await updateCustomerAction(customer.id, values)
      : await createCustomerAction(values);
    if (res?.error) setServerError(res.error);
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Sửa khách hàng" : "Thêm khách hàng"}</DialogTitle>
          <DialogDescription>Thông tin liên hệ của khách.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Field label="Tên khách hàng" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="Nguyễn Văn A" {...register("name")} />
          </Field>
          <Field label="Điện thoại (tùy chọn)" htmlFor="phone">
            <Input id="phone" placeholder="09xxxxxxxx" {...register("phone")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={isSubmitting}>{customer ? "Lưu" : "Tạo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CollectDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!customer) return;
    const value = Number(amount || customer.debt);
    setLoading(true);
    setError(null);
    const res = await collectDebtAction(customer.id, value);
    setLoading(false);
    if (res?.error) setError(res.error);
    else {
      setAmount("");
      onClose();
    }
  }

  return (
    <Dialog open={customer !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thu nợ</DialogTitle>
          <DialogDescription>
            {customer?.name} đang nợ {customer ? formatVnd(customer.debt) : ""}.
          </DialogDescription>
        </DialogHeader>
        <Field label="Số tiền thu" htmlFor="amount" error={error ?? undefined}>
          <Input
            id="amount"
            type="number"
            min={0}
            placeholder={String(customer?.debt ?? 0)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tnum"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          <Button loading={loading} onClick={confirm}>Xác nhận thu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!customer) return;
    setLoading(true);
    setError(null);
    const res = await deleteCustomerAction(customer.id);
    setLoading(false);
    if (res?.error) setError(res.error);
    else onClose();
  }

  return (
    <Dialog open={customer !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa khách hàng?</DialogTitle>
          <DialogDescription>Xóa “{customer?.name}”. Không thể hoàn tác.</DialogDescription>
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
