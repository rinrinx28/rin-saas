import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { createClient } from "@/lib/supabase/server";

// Hub → Tạo cửa hàng mới (org + chi nhánh đầu tiên). ADR 0015.
export default async function NewShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <Link
          href="/app"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Cửa hàng của bạn
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Tạo cửa hàng mới</h1>
        <p className="text-sm text-fg-muted">
          Mỗi cửa hàng có dữ liệu, nhân sự và gói cước riêng.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
