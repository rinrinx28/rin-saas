"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { updateEInvoiceConfigAction } from "@/app/(app)/settings/einvoice/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { EINVOICE_PROVIDERS, getProviderMeta } from "@/lib/einvoice/providers";
import { type EInvoiceConfigInput, einvoiceConfigSchema } from "@/lib/validations/settings";

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:border-primary focus-visible:outline-none";

export function EInvoiceConfigForm({ initial }: { initial: EInvoiceConfigInput }) {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EInvoiceConfigInput>({
    resolver: zodResolver(einvoiceConfigSchema),
    defaultValues: initial,
  });

  const provider = useWatch({ control, name: "provider" });
  const invoiceType = useWatch({ control, name: "invoiceType" });
  const meta = getProviderMeta(provider);
  const isStub = !meta?.implemented;

  async function onSubmit(values: EInvoiceConfigInput) {
    setServerError(null);
    const res = await updateEInvoiceConfigAction(values);
    if (res?.error) {
      setServerError(res.error);
      return;
    }
    toast.success("Đã lưu cấu hình HĐĐT");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
        >
          {serverError}
        </p>
      )}

      {/* Nhà cung cấp */}
      <Card>
        <CardHeader>
          <CardTitle>Nhà cung cấp</CardTitle>
          <CardDescription>Chọn dịch vụ HĐĐT và bật phát hành cho cửa hàng.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Nhà cung cấp" htmlFor="provider" error={errors.provider?.message}>
            <select id="provider" className={selectClass} {...register("provider")}>
              {EINVOICE_PROVIDERS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                  {p.implemented ? "" : " — sắp có"}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
              {...register("enabled")}
            />
            Bật phát hành HĐĐT cho cửa hàng này
          </label>

          {isStub && (
            <p className="rounded-md border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
              Provider thật chưa được cài đặt. Hệ thống tạm phát hành bằng <b>giả lập</b> để chạy
              thử luồng — số/ký hiệu/mã CQT là dữ liệu mẫu, chưa có giá trị pháp lý.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Thông tin người bán */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin người bán</CardTitle>
          <CardDescription>Hiển thị trên hóa đơn phát hành.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Mã số thuế" htmlFor="sellerTaxCode" error={errors.sellerTaxCode?.message}>
            <Input id="sellerTaxCode" placeholder="0312345678" {...register("sellerTaxCode")} />
          </Field>
          <Field label="Tên đơn vị" htmlFor="sellerName" error={errors.sellerName?.message}>
            <Input id="sellerName" placeholder="Công ty TNHH ..." {...register("sellerName")} />
          </Field>
          <Field label="Địa chỉ" htmlFor="sellerAddress" error={errors.sellerAddress?.message}>
            <Input id="sellerAddress" placeholder="Số nhà, đường, phường, tỉnh/thành" {...register("sellerAddress")} />
          </Field>
        </CardContent>
      </Card>

      {/* Loại hóa đơn */}
      <Card>
        <CardHeader>
          <CardTitle>Loại hóa đơn</CardTitle>
          <CardDescription>
            Mẫu số tự suy ra theo loại: GTGT = 1, bán hàng = 2. Ký hiệu 6 ký tự theo TT 78
            (vd <span className="font-mono">C26TYY</span>).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Loại hóa đơn" htmlFor="invoiceType" error={errors.invoiceType?.message}>
            <select id="invoiceType" className={selectClass} {...register("invoiceType")}>
              <option value="sales">Hóa đơn bán hàng (mẫu 2)</option>
              <option value="gtgt">Hóa đơn GTGT (mẫu 1)</option>
            </select>
          </Field>
          {invoiceType === "gtgt" && (
            <Field label="Thuế suất GTGT" htmlFor="taxRate" error={errors.taxRate?.message}>
              <select
                id="taxRate"
                className={selectClass}
                {...register("taxRate", { valueAsNumber: true })}
              >
                <option value="10">10%</option>
                <option value="8">8%</option>
                <option value="5">5%</option>
                <option value="0">0% / KCT</option>
              </select>
            </Field>
          )}
          <Field label="Ký hiệu" htmlFor="series" error={errors.series?.message}>
            <Input id="series" placeholder="C26TYY" {...register("series")} />
          </Field>
        </CardContent>
      </Card>

      {/* Kết nối API */}
      <Card>
        <CardHeader>
          <CardTitle>Kết nối API</CardTitle>
          <CardDescription>
            Thông tin đăng nhập dịch vụ HĐĐT — chỉ quản lý xem được. Dùng khi cắm provider thật.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Endpoint" htmlFor="apiEndpoint" error={errors.apiEndpoint?.message}>
            <Input id="apiEndpoint" placeholder="https://api.nhacungcap.vn" {...register("apiEndpoint")} />
          </Field>
          <Field label="Tài khoản" htmlFor="apiUsername" error={errors.apiUsername?.message}>
            <Input id="apiUsername" autoComplete="off" {...register("apiUsername")} />
          </Field>
          <Field label="Mật khẩu / Token" htmlFor="apiSecret" error={errors.apiSecret?.message}>
            <Input id="apiSecret" type="password" autoComplete="off" {...register("apiSecret")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Lưu cấu hình
        </Button>
      </div>
    </form>
  );
}
