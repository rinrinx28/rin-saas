"use client";

import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { deleteProductAction } from "@/app/(app)/products/actions";
import { Pagination } from "@/components/list/pagination";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatVnd } from "@/lib/utils";

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
  prices: number[];
}

function priceLabel(prices: number[]): string {
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`;
}

export function ProductList({
  products,
  page,
  totalPages,
  total,
  filtered,
}: {
  products: ProductRow[];
  page: number;
  totalPages: number;
  total: number;
  filtered: boolean;
}) {
  const [deleting, setDeleting] = useState<ProductRow | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="tnum text-sm text-fg-muted">{total} sản phẩm</p>
        <Button size="sm" asChild>
          <Link href="/products/new">
            <Plus /> Thêm sản phẩm
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <Package className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">{filtered ? "Không có sản phẩm phù hợp" : "Chưa có sản phẩm"}</p>
            <p className="text-sm text-fg-muted">
              {filtered ? "Thử đổi từ khóa hoặc danh mục." : "Thêm sản phẩm đầu tiên để bắt đầu bán hàng."}
            </p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14"></TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Giá bán</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="relative size-9 overflow-hidden rounded-md bg-surface-2">
                    {p.imageUrl && (
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="36px" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="tnum text-fg-muted">{p.sku ?? "—"}</TableCell>
                <TableCell className="text-fg-muted">{p.categoryName ?? "—"}</TableCell>
                <TableCell className="tnum text-right">{priceLabel(p.prices)}</TableCell>
                <TableCell className="text-center">
                  {p.isActive ? (
                    <Badge variant="success">Đang bán</Badge>
                  ) : (
                    <Badge>Ngừng</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Sửa" asChild>
                      <Link href={`/products/${p.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Xóa"
                      onClick={() => setDeleting(p)}
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
      {products.length > 0 && <Pagination page={page} totalPages={totalPages} total={total} />}

      <DeleteDialog product={deleting} onClose={() => setDeleting(null)} />
    </Card>
  );
}

function DeleteDialog({
  product,
  onClose,
}: {
  product: ProductRow | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!product) return;
    setLoading(true);
    const res = await deleteProductAction(product.id);
    setLoading(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã xoá sản phẩm");
      onClose();
    }
  }

  return (
    <Dialog open={product !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá sản phẩm?</DialogTitle>
          <DialogDescription>
            Xoá “{product?.name}” cùng toàn bộ biến thể và tồn kho liên quan. Hành động này
            không thể hoàn tác.
          </DialogDescription>
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
