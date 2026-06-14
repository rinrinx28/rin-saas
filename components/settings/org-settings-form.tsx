"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateOrgAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { type OrgInput, orgSchema } from "@/lib/validations/settings";

export function OrgSettingsForm({ name }: { name: string }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgInput>({ resolver: zodResolver(orgSchema), values: { name } });

  async function onSubmit(values: OrgInput) {
    const res = await updateOrgAction(values);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã lưu thông tin cửa hàng");
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
          <Field label="Tên cửa hàng" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Button type="submit" loading={isSubmitting}>Lưu</Button>
        </form>
      </CardContent>
    </Card>
  );
}
