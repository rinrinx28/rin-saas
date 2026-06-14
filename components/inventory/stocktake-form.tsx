"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { adjustStockAction } from "@/app/(app)/inventory/stocktake/actions";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type StocktakeInput, stocktakeSchema } from "@/lib/validations/stocktake";

export interface StocktakeRow {
  variantId: string;
  label: string;
  current: number;
}

export function StocktakeForm({ storeId, rows }: { storeId: string; rows: StocktakeRow[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<StocktakeInput>({
    resolver: zodResolver(stocktakeSchema),
    defaultValues: {
      storeId,
      items: rows.map((r) => ({ variantId: r.variantId, counted: r.current })),
    },
  });
  const watched = useWatch({ control, name: "items" });

  async function onSubmit(values: StocktakeInput) {
    setServerError(null);
    const res = await adjustStockAction(values);
    if (res?.error) setServerError(res.error);
  }

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Kiểm kho" />
        <Card>
          <CardContent className="p-6 text-sm text-fg-muted">Chưa có sản phẩm để kiểm kho.</CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Kiểm kho" description="Nhập số thực đếm — hệ thống tự điều chỉnh tồn và ghi lịch sử." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <p role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">Tồn hệ thống</TableHead>
                <TableHead className="w-32 text-right">Thực đếm</TableHead>
                <TableHead className="text-right">Lệch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                const counted = Number(watched?.[i]?.counted ?? r.current);
                const delta = counted - r.current;
                return (
                  <TableRow key={r.variantId}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="tnum text-right text-fg-muted">{r.current}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        className="tnum h-8 w-24 text-right"
                        {...register(`items.${i}.counted`, { valueAsNumber: true })}
                      />
                    </TableCell>
                    <TableCell className={cn("tnum text-right", delta === 0 ? "text-fg-subtle" : delta > 0 ? "text-success" : "text-danger")}>
                      {delta > 0 ? `+${delta}` : delta}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push("/inventory")}>Hủy</Button>
          <Button type="submit" loading={isSubmitting}>Lưu kiểm kho</Button>
        </div>
      </form>
    </>
  );
}
