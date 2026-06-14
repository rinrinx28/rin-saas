"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

// Điều hướng phân trang, giữ nguyên các param khác trên URL.
export function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function goto(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-end border-t border-border px-4 py-3 text-sm text-fg-muted">
        <span className="tnum">{total} mục</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <span className="tnum text-fg-muted">{total} mục</span>
      <div className="flex items-center gap-3">
        <span className="tnum text-fg-muted">
          Trang {page} / {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => goto(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang sau"
            disabled={page >= totalPages}
            onClick={() => goto(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
