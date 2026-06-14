"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  createProductAction,
  updateProductAction,
} from "@/app/(app)/products/actions";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyField } from "@/components/ui/money-input";
import { uploadProductImage } from "@/lib/storage";
import { type ProductInput, productSchema } from "@/lib/validations/catalog";

interface Category {
  id: string;
  name: string;
}

export interface ProductFormData {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  variants: {
    id: string;
    name: string;
    barcode: string | null;
    price: number;
    cost: number;
  }[];
}

interface ProductFormProps {
  categories: Category[];
  activeOrgId: string;
  product?: ProductFormData;
}

export function ProductForm({ categories, activeOrgId, product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      categoryId: product?.category_id ?? "",
      isActive: product?.is_active ?? true,
      imageUrl: product?.image_url ?? "",
      variants: product?.variants.map((v) => ({
        id: v.id,
        name: v.name,
        barcode: v.barcode ?? "",
        price: v.price,
        cost: v.cost,
      })) ?? [{ name: "Mặc định", barcode: "", price: 0, cost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  async function handleFile(file: File) {
    setUploading(true);
    setServerError(null);
    try {
      const url = await uploadProductImage(file, activeOrgId);
      setImageUrl(url);
    } catch {
      setServerError("Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: ProductInput) {
    setServerError(null);
    const payload = { ...values, imageUrl: imageUrl ?? "" };
    const res = isEdit
      ? await updateProductAction(product.id, payload)
      : await createProductAction(payload);
    if (res?.error) setServerError(res.error);
    // thành công → action redirect /products
  }

  return (
    <>
      <PageHeader
        title={isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        description={isEdit ? product.name : "Tạo sản phẩm mới và các biến thể."}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {serverError}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Thông tin chính */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <Field label="Tên sản phẩm" htmlFor="name" error={errors.name?.message}>
                <Input id="name" placeholder="Áo thun cotton" {...register("name")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU (tùy chọn)" htmlFor="sku" error={errors.sku?.message}>
                  <Input id="sku" placeholder="A001" {...register("sku")} />
                </Field>
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Danh mục</Label>
                  <select
                    id="categoryId"
                    className="flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-base text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:bg-surface"
                    {...register("categoryId")}
                  >
                    <option value="">— Chưa phân loại —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" {...register("isActive")} />
                Đang kinh doanh
              </label>
            </CardContent>
          </Card>

          {/* Ảnh */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <Label>Ảnh sản phẩm</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-2 text-fg-subtle transition-colors hover:bg-surface"
              >
                {uploading ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : imageUrl ? (
                  <Image src={imageUrl} alt="Ảnh sản phẩm" fill className="object-cover" sizes="280px" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-sm">
                    <ImagePlus className="size-6" />
                    Chọn ảnh
                  </span>
                )}
              </button>
              {imageUrl && !uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setImageUrl(null)}
                >
                  <X /> Bỏ ảnh
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Biến thể */}
        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <p className="font-medium">Biến thể</p>
              <p className="text-sm text-fg-muted">Size/màu… — giá &amp; vốn theo đồng (số nguyên).</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", barcode: "", price: 0, cost: 0 })}
            >
              <Plus /> Thêm biến thể
            </Button>
          </div>
          <CardContent className="space-y-3 p-4">
            {errors.variants?.message && (
              <p className="text-sm text-danger">{errors.variants.message}</p>
            )}
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="grid items-start gap-2 rounded-md border border-border p-3 sm:grid-cols-[1.4fr_1.2fr_1fr_1fr_auto]"
              >
                <Field label="Tên" htmlFor={`v-name-${i}`} error={errors.variants?.[i]?.name?.message}>
                  <Input id={`v-name-${i}`} placeholder="Mặc định / S / Đỏ" {...register(`variants.${i}.name`)} />
                </Field>
                <Field label="Barcode" htmlFor={`v-bc-${i}`}>
                  <Input id={`v-bc-${i}`} placeholder="(tùy chọn)" {...register(`variants.${i}.barcode`)} />
                </Field>
                <Field label="Giá bán" htmlFor={`v-price-${i}`} error={errors.variants?.[i]?.price?.message}>
                  <MoneyField control={control} name={`variants.${i}.price`} id={`v-price-${i}`} />
                </Field>
                <Field label="Giá vốn" htmlFor={`v-cost-${i}`} error={errors.variants?.[i]?.cost?.message}>
                  <MoneyField control={control} name={`variants.${i}.cost`} id={`v-cost-${i}`} />
                </Field>
                <div className="flex h-full items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Xóa biến thể"
                    disabled={fields.length === 1}
                    onClick={() => remove(i)}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push("/products")}>
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={uploading}>
            {isEdit ? "Lưu thay đổi" : "Tạo sản phẩm"}
          </Button>
        </div>
      </form>
    </>
  );
}
