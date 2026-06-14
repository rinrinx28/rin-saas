"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface FilterOption {
  value: string;
  label: string;
}

// Select đẩy lựa chọn vào URL (param tùy biến), reset về trang 1.
// value rỗng ("") = bỏ lọc → xóa param.
export function FilterSelect({
  paramKey,
  options,
  ariaLabel,
}: {
  paramKey: string;
  options: FilterOption[];
  ariaLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramKey) ?? "";

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(paramKey, value);
    else next.delete(paramKey);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <select
      aria-label={ariaLabel}
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg transition-colors hover:bg-surface focus-visible:border-primary focus-visible:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
