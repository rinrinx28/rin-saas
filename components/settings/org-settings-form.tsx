"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { updateOrgAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { uploadOrgLogo } from "@/lib/storage";
import { type OrgInput, orgSchema } from "@/lib/validations/settings";

export function OrgSettingsForm({
  name,
  logoUrl: initialLogo,
  orgId,
}: {
  name: string;
  logoUrl: string | null;
  orgId: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgInput>({ resolver: zodResolver(orgSchema), values: { name } });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadOrgLogo(file, orgId);
      setLogoUrl(url);
    } catch {
      toast.error("Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: OrgInput) {
    const res = await updateOrgAction({ ...values, logoUrl: logoUrl ?? "" });
    if (res?.error) toast.error(res.error);
    else toast.success("Đã lưu thông tin cửa hàng");
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5" noValidate>
          {/* Ảnh đại diện cửa hàng */}
          <div className="flex items-center gap-4">
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
              aria-label="Tải ảnh đại diện cửa hàng"
              className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-bg font-display text-2xl font-semibold text-primary ring-1 ring-inset ring-primary/15 transition-opacity hover:opacity-90"
            >
              {uploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : logoUrl ? (
                <Image src={logoUrl} alt="Ảnh cửa hàng" fill className="object-cover" sizes="80px" />
              ) : (
                initial
              )}
            </button>
            <div className="space-y-1.5">
              <Label>Ảnh đại diện cửa hàng</Label>
              <p className="text-sm text-fg-muted">PNG hoặc JPG, ảnh vuông hiển thị đẹp nhất.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus /> Chọn ảnh
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                    <X /> Bỏ ảnh
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Field label="Tên cửa hàng" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Button type="submit" loading={isSubmitting}>Lưu</Button>
        </form>
      </CardContent>
    </Card>
  );
}
