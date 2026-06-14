import { cookies } from "next/headers";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { SIDEBAR_COOKIE } from "@/lib/constants";

// App shell — ADR 0005. Guard auth + org active sẽ thêm khi gắn Supabase (P1 backend).
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Đọc trạng thái thu gọn từ cookie → render đúng ngay từ server (không flash).
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <Sidebar defaultCollapsed={defaultCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
