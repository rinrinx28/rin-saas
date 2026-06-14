"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type OnboardingInput, onboardingSchema } from "@/lib/validations/auth";

export default function OnboardingPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({ resolver: zodResolver(onboardingSchema) });

  async function onSubmit() {
    // TODO(P1 backend): tạo organization + membership owner + store đầu tiên (Server Action).
    await new Promise((r) => setTimeout(r, 600));
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Boxes className="size-6 text-primary" />
          <span className="font-display text-xl font-semibold tracking-tight">
            rin·saas
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thiết lập cửa hàng</CardTitle>
            <CardDescription>
              Tạo cửa hàng và chi nhánh đầu tiên để bắt đầu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field
                label="Tên cửa hàng"
                htmlFor="orgName"
                error={errors.orgName?.message}
              >
                <Input
                  id="orgName"
                  placeholder="Cửa hàng Thời trang ABC"
                  aria-invalid={!!errors.orgName}
                  {...register("orgName")}
                />
              </Field>

              <Field
                label="Tên chi nhánh đầu tiên"
                htmlFor="storeName"
                error={errors.storeName?.message}
              >
                <Input
                  id="storeName"
                  placeholder="Chi nhánh Quận 1"
                  aria-invalid={!!errors.storeName}
                  {...register("storeName")}
                />
              </Field>

              <Field
                label="Địa chỉ chi nhánh (tùy chọn)"
                htmlFor="storeAddress"
                error={errors.storeAddress?.message}
              >
                <Input
                  id="storeAddress"
                  placeholder="123 Lê Lợi, Quận 1, TP.HCM"
                  {...register("storeAddress")}
                />
              </Field>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                Hoàn tất & vào quản lý
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
