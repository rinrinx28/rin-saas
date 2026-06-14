"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/(app)/categories/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { type CategoryInput, categorySchema } from "@/lib/validations/catalog";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const formOpen = creating || editing !== null;

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm text-fg-muted">
          {categories.length} danh mục
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Thêm danh mục
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <FolderTree className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Chưa có danh mục</p>
            <p className="text-sm text-fg-muted">
              Thêm danh mục đầu tiên để phân loại sản phẩm.
            </p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Danh mục cha</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-fg-muted">
                  {c.parent_id ? nameById.get(c.parent_id) ?? "—" : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Sửa"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Xóa"
                      onClick={() => setDeleting(c)}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog tạo/sửa */}
      <CategoryFormDialog
        open={formOpen}
        category={editing}
        categories={categories}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      {/* Dialog xác nhận xóa */}
      <DeleteDialog
        category={deleting}
        onClose={() => setDeleting(null)}
      />
    </Card>
  );
}

function CategoryFormDialog({
  open,
  category,
  categories,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    values: {
      name: category?.name ?? "",
      parentId: category?.parent_id ?? "",
    },
  });

  async function onSubmit(values: CategoryInput) {
    setServerError(null);
    const res = category
      ? await updateCategoryAction(category.id, values)
      : await createCategoryAction(values);
    if (res?.error) setServerError(res.error);
    else onClose();
  }

  const parentOptions = categories.filter((c) => c.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
          <DialogDescription>
            {category ? "Cập nhật thông tin danh mục." : "Tạo danh mục mới."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <p
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {serverError}
            </p>
          )}

          <Field label="Tên danh mục" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="Vd: Áo, Quần, Phụ kiện" {...register("name")} />
          </Field>

          <div className="space-y-1.5">
            <Label htmlFor="parentId">Danh mục cha (tùy chọn)</Label>
            <select
              id="parentId"
              className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface"
              {...register("parentId")}
            >
              <option value="">— Không có —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {category ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function confirm() {
    if (!category) return;
    setLoading(true);
    setServerError(null);
    const res = await deleteCategoryAction(category.id);
    setLoading(false);
    if (res?.error) setServerError(res.error);
    else onClose();
  }

  return (
    <Dialog open={category !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa danh mục?</DialogTitle>
          <DialogDescription>
            Xóa “{category?.name}”. Sản phẩm thuộc danh mục này sẽ về “chưa phân
            loại”. Hành động không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}
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
