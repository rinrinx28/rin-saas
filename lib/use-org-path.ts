"use client";

import { usePathname } from "next/navigation";

// Tiền tố link theo cửa hàng đang ở: "/products" → "/s/<orgId>/products".
// orgId lấy từ URL hiện tại (/s/<orgId>/...). Ngoài phạm vi workspace → giữ nguyên
// (middleware sẽ tự nâng URL trần lên có org bằng cookie active_org).
export function useOrgPath(): (path: string) => string {
  const pathname = usePathname();
  const orgId = pathname.match(/^\/s\/([^/]+)/)?.[1] ?? null;
  return (path: string) => (orgId ? `/s/${orgId}${path}` : path);
}
