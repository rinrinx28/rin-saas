"use client";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BankIcon } from "@/components/payment/bank-icon";
import { findBank, VN_BANKS } from "@/lib/payment/vn-banks";
import { cn } from "@/lib/utils";

// Combobox chọn ngân hàng VN — option luôn kèm logo. Giá trị là shortName.
export function BankSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (shortName: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = findBank(value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VN_BANKS;
    return VN_BANKS.filter(
      (b) =>
        b.shortName.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q),
    );
  }, [query]);

  function pick(shortName: string) {
    onChange(shortName);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-left text-sm transition-colors hover:bg-surface focus-visible:border-primary focus-visible:outline-none"
      >
        {selected ? (
          <>
            <BankIcon bank={selected} size="sm" />
            <span className="truncate font-medium">{selected.shortName}</span>
          </>
        ) : (
          <span className="text-fg-subtle">Chọn ngân hàng…</span>
        )}
        <ChevronsUpDown className="ml-auto size-4 shrink-0 text-fg-subtle" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm ngân hàng…"
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-fg-subtle"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => pick("")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-2"
                >
                  <X className="size-4" /> Bỏ chọn
                </button>
              </li>
            )}
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-fg-muted">Không tìm thấy ngân hàng.</li>
            ) : (
              results.map((b) => (
                <li key={b.code}>
                  <button
                    type="button"
                    onClick={() => pick(b.shortName)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2",
                      b.shortName === value && "bg-surface-2",
                    )}
                  >
                    <BankIcon bank={b} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{b.shortName}</span>
                      <span className="block truncate text-xs text-fg-muted">{b.name}</span>
                    </span>
                    {b.shortName === value && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
