import { redirect } from "next/navigation";

// Tạm: vào thẳng app shell. Khi có auth (P1 backend): chưa đăng nhập → /login.
export default function RootPage() {
  redirect("/dashboard");
}
