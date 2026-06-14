"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  addMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "@/app/(app)/settings/members/actions";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AddMemberInput, addMemberSchema } from "@/lib/validations/member";

export interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
}

const ROLE_LABEL: Record<string, string> = { owner: "Chủ sở hữu", admin: "Quản lý", staff: "Nhân viên" };
const roleBadge = (role: string) =>
  role === "owner" ? "primary" : role === "admin" ? "info" : "neutral";

const selectClass =
  "h-8 rounded-md border border-border bg-surface-2 px-2 text-sm text-fg transition-colors hover:bg-surface focus-visible:border-primary";

export function MemberManager({
  members,
  myRole,
  myUserId,
}: {
  members: Member[];
  myRole: string | null;
  myUserId: string;
}) {
  const canManage = myRole === "owner" || myRole === "admin";
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function changeRole(m: Member, role: string) {
    setRowError(null);
    const res = await updateMemberRoleAction(m.id, role);
    if (res?.error) setRowError(res.error);
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-fg-muted">{members.length} thành viên</p>
        {canManage && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus /> Thêm nhân viên
          </Button>
        )}
      </div>

      {rowError && (
        <p role="alert" className="border-b border-border bg-danger-bg px-4 py-2 text-sm text-danger">
          {rowError}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Email</TableHead>
            <TableHead>Vai trò</TableHead>
            {canManage && <TableHead className="w-16 text-right">Xóa</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const isSelf = m.user_id === myUserId;
            return (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.email}
                  {isSelf && <span className="ml-2 text-xs text-fg-subtle">(Bạn)</span>}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <select
                      className={selectClass}
                      defaultValue={m.role}
                      onChange={(e) => changeRole(m, e.target.value)}
                    >
                      <option value="owner">Chủ sở hữu</option>
                      <option value="admin">Quản lý</option>
                      <option value="staff">Nhân viên</option>
                    </select>
                  ) : (
                    <Badge variant={roleBadge(m.role)}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {!isSelf && (
                      <Button variant="ghost" size="icon" aria-label="Xóa" onClick={() => setRemoving(m)}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {canManage && <AddDialog open={adding} onClose={() => setAdding(false)} />}
      <RemoveDialog member={removing} onClose={() => setRemoving(null)} />
    </Card>
  );
}

function AddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    values: { email: "", role: "staff" },
  });

  async function onSubmit(values: AddMemberInput) {
    setServerError(null);
    const res = await addMemberAction(values);
    if (res?.error) setServerError(res.error);
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>
            Nhập email của tài khoản đã đăng ký để thêm vào cửa hàng.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" placeholder="nhanvien@email.com" {...register("email")} />
          </Field>
          <div className="space-y-1.5">
            <Label htmlFor="role">Vai trò</Label>
            <select id="role" className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg" {...register("role")}>
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản lý</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={isSubmitting}>Thêm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!member) return;
    setLoading(true);
    setError(null);
    const res = await removeMemberAction(member.id);
    setLoading(false);
    if (res?.error) setError(res.error);
    else onClose();
  }

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa thành viên?</DialogTitle>
          <DialogDescription>Gỡ “{member?.email}” khỏi cửa hàng.</DialogDescription>
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
