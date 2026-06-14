"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validations/auth";

export interface ActionResult {
  error?: string;
}

export async function createOrganizationAction(
  values: unknown,
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_org_name: parsed.data.orgName,
    p_store_name: parsed.data.storeName,
    p_store_address: parsed.data.storeAddress ?? null,
  });
  if (error || !orgId) return { error: "Không tạo được cửa hàng. Vui lòng thử lại." };

  // Đặt org đang active vào cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId as string, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  redirect("/dashboard");
}
