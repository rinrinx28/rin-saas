"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

// Ô tìm kiếm đẩy giá trị vào URL (param `q` mặc định) sau debounce, reset về trang 1.
export function SearchInput({
  placeholder = "Tìm kiếm…",
  paramKey = "q",
}: {
  placeholder?: string;
  paramKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(paramKey) ?? "");
  const mounted = useRef(false);

  useEffect(() => {
    // Bỏ qua lần chạy đầu để không đẩy URL khi vừa mount.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      const trimmed = value.trim();
      if (trimmed) next.set(paramKey, trimmed);
      else next.delete(paramKey);
      next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // params/router/pathname ổn định trong vòng đời; chỉ phụ thuộc value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
