"use client";

import { Check, ChevronsUpDown, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { quickCreateCustomerAction } from "@/app/(pos)/pos/actions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
}

// Chọn khách hàng: tìm theo tên/sđt, tạo nhanh ngay tại POS.
export function CustomerCombobox({
  customers,
  value,
  onChange,
  onCreated,
}: {
  customers: PosCustomer[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (c: PosCustomer) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q),
    );
  }, [customers, q]);

  const exact = customers.some((c) => c.name.toLowerCase() === q || c.phone === query.trim());
  const canCreate = q.length > 0 && !exact;

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  async function create() {
    const raw = query.trim();
    if (!raw) return;
    const isPhone = /^\d{6,}$/.test(raw);
    setBusy(true);
    const res = await quickCreateCustomerAction(raw, isPhone ? raw : null);
    setBusy(false);
    if (res.error || !res.customer) {
      toast.error(res.error ?? "Không tạo được khách hàng");
      return;
    }
    toast.success(`Đã thêm khách ${res.customer.name}`);
    onCreated(res.customer);
    pick(res.customer.id);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-left text-sm transition-colors hover:bg-surface focus-visible:border-primary focus-visible:outline-none"
      >
        <span className={cn("truncate", selected ? "font-medium" : "text-fg-subtle")}>
          {selected ? `${selected.name}${selected.phone ? ` · ${selected.phone}` : ""}` : "Khách lẻ"}
        </span>
        <ChevronsUpDown className="ml-auto size-4 shrink-0 text-fg-subtle" />
      </button>

      {open && (
        <div className="absolute bottom-full z-50 mb-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên hoặc số điện thoại…"
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-fg-subtle"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => pick("")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted hover:bg-surface-2"
              >
                <X className="size-4" /> Khách lẻ
              </button>
            </li>
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => pick(c.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-2",
                    c.id === value && "bg-surface-2",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    {c.phone && <span className="tnum block truncate text-xs text-fg-muted">{c.phone}</span>}
                  </span>
                  {c.id === value && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
            {canCreate && (
              <li className="border-t border-border">
                <button
                  type="button"
                  disabled={busy}
                  onClick={create}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-surface-2 disabled:opacity-60"
                >
                  <UserPlus className="size-4" /> Tạo khách “{query.trim()}”
                </button>
              </li>
            )}
            {results.length === 0 && !canCreate && (
              <li className="px-3 py-6 text-center text-sm text-fg-muted">Không tìm thấy khách.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
