"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailPlus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  cancelInviteAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberAction,
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
import { useToast } from "@/components/ui/toast";
import { isStoreScoped, ROLE_LABEL, roleBadge } from "@/lib/roles";
import { type InviteMemberInput, inviteMemberSchema } from "@/lib/validations/member";

export interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  store_id: string | null;
  store_name: string | null;
}
export interface Invite {
  id: string;
  email: string;
  role: string;
  store_id: string | null;
  store_name: string | null;
  invited_at: string;
}
export interface StoreOpt {
  id: string;
  name: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:border-primary focus-visible:outline-none";

function scopeLabel(role: string, storeName: string | null): string {
  if (!isStoreScoped(role)) return "Toàn cửa hàng";
  return storeName ?? "—";
}

export function MemberManager({
  members,
  invites,
  stores,
  myRole,
  myUserId,
}: {
  members: Member[];
  invites: Invite[];
  stores: StoreOpt[];
  myRole: string | null;
  myUserId: string;
}) {
  const toast = useToast();
  const canManage = myRole === "owner" || myRole === "admin";
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  async function cancelInvite(id: string) {
    const res = await cancelInviteAction(id);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã huỷ lời mời");
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="text-sm text-fg-muted">{members.length} thành viên</p>
          {canManage && (
            <Button size="sm" onClick={() => setInviting(true)}>
              <MailPlus /> Mời nhân viên
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Chi nhánh</TableHead>
              {canManage && <TableHead className="w-24 text-right">Thao tác</TableHead>}
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
                    <Badge variant={roleBadge(m.role)}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  </TableCell>
                  <TableCell className="text-fg-muted">{scopeLabel(m.role, m.store_name)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                          Sửa
                        </Button>
                        {!isSelf && (
                          <Button variant="ghost" size="icon" aria-label="Xóa" onClick={() => setRemoving(m)}>
                            <Trash2 className="size-4 text-danger" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {canManage && invites.length > 0 && (
        <Card>
          <div className="border-b border-border p-4">
            <p className="text-sm font-medium">Lời mời đang chờ</p>
            <p className="text-xs text-fg-muted">Chờ người nhận đăng nhập bằng email để đồng ý/từ chối.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead className="w-16 text-right">Huỷ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadge(i.role)}>{ROLE_LABEL[i.role] ?? i.role}</Badge>
                  </TableCell>
                  <TableCell className="text-fg-muted">{scopeLabel(i.role, i.store_name)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Huỷ lời mời"
                      onClick={() => cancelInvite(i.id)}
                    >
                      <X className="size-4 text-danger" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {canManage && (
        <InviteDialog open={inviting} stores={stores} onClose={() => setInviting(false)} />
      )}
      {canManage && (
        <EditDialog member={editing} stores={stores} onClose={() => setEditing(null)} />
      )}
      <RemoveDialog member={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}

function InviteDialog({
  open,
  stores,
  onClose,
}: {
  open: boolean;
  stores: StoreOpt[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState("staff");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    values: { email: "", role: "staff", storeId: stores[0]?.id },
  });

  async function onSubmit(values: InviteMemberInput) {
    const res = await inviteMemberAction(values);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(`Đã gửi lời mời tới ${values.email}`);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mời nhân viên</DialogTitle>
          <DialogDescription>
            Nhập email; người nhận sẽ thấy lời mời khi đăng nhập và có thể từ chối.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" placeholder="nhanvien@email.com" {...register("email")} />
          </Field>
          <div className="space-y-1.5">
            <Label htmlFor="role">Vai trò</Label>
            <select
              id="role"
              className={selectClass}
              {...register("role", { onChange: (e) => setRole(e.target.value) })}
            >
              <option value="staff">Nhân viên</option>
              <option value="store_manager">Quản lý chi nhánh</option>
              <option value="admin">Quản lý cửa hàng</option>
            </select>
          </div>
          {isStoreScoped(role) && (
            <div className="space-y-1.5">
              <Label htmlFor="storeId">Chi nhánh</Label>
              <select id="storeId" className={selectClass} {...register("storeId")}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.storeId && <p className="text-sm text-danger">{errors.storeId.message}</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Gửi lời mời
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  member,
  stores,
  onClose,
}: {
  member: Member | null;
  stores: StoreOpt[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState(member?.role ?? "staff");
  const [storeId, setStoreId] = useState(member?.store_id ?? stores[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!member) return;
    setLoading(true);
    const res = await updateMemberAction(member.id, role, isStoreScoped(role) ? storeId : null);
    setLoading(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã cập nhật thành viên");
      onClose();
    }
  }

  return (
    <Dialog
      // Remount theo member để state khởi tạo lại đúng.
      key={member?.id ?? "none"}
      open={member !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa thành viên</DialogTitle>
          <DialogDescription>{member?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Vai trò</Label>
            <select id="edit-role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value)}>
              {member?.role === "owner" && <option value="owner">Chủ</option>}
              <option value="admin">Quản lý cửa hàng</option>
              <option value="store_manager">Quản lý chi nhánh</option>
              <option value="staff">Nhân viên</option>
            </select>
          </div>
          {isStoreScoped(role) && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-store">Chi nhánh</Label>
              <select id="edit-store" className={selectClass} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={loading} onClick={save}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!member) return;
    setLoading(true);
    const res = await removeMemberAction(member.id);
    setLoading(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã xoá thành viên");
      onClose();
    }
  }

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa thành viên?</DialogTitle>
          <DialogDescription>Gỡ “{member?.email}” khỏi cửa hàng.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="destructive" loading={loading} onClick={confirm}>
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
