import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "rin·saas — Phần mềm quản lý bán hàng & kho đa chi nhánh",
  description:
    "Hợp nhất POS, tồn kho đa chi nhánh realtime, hóa đơn điện tử và đối soát chuyển khoản tự động — trong một nơi. Dùng thử miễn phí.",
  openGraph: {
    title: "rin·saas — Quản lý bán hàng gọn gàng",
    description:
      "POS, tồn kho realtime, hóa đơn điện tử, đối soát chuyển khoản — cho cửa hàng đa chi nhánh.",
    type: "website",
  },
};

export default async function RootPage() {
  // Landing công khai; nếu đã đăng nhập → nút CTA dẫn thẳng vào ứng dụng.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <LandingPage isAuthed={!!user} />;
}
