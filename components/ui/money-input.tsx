"use client";

import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn, formatVnd } from "@/lib/utils";

// Bội số gợi ý nhanh (nhập 1 → 1.000 / 10.000 / 100.000).
const SUGGEST_FACTORS = [1000, 10000, 100000];
// Chỉ gợi ý khi giá trị gõ vào còn nhỏ (dạng viết tắt).
const SUGGEST_MAX = 1000;

// Ô nhập tiền: tự format theo nghìn (vi-VN) + hậu tố đ; tuỳ chọn gợi ý 3 mức.
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder,
  className,
  suggest = false,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  suggest?: boolean;
  "aria-label"?: string;
}) {
  const display = value > 0 ? value.toLocaleString("vi-VN") : "";

  function handle(raw: string) {
    const digits = raw.replace(/\D/g, "");
    onChange(digits ? Number(digits) : 0);
  }

  const suggestions =
    suggest && value > 0 && value < SUGGEST_MAX ? SUGGEST_FACTORS.map((f) => value * f) : [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(e) => handle(e.target.value)}
          className={cn("tnum pr-7", className)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
          đ
        </span>
      </div>
      {/* Co giãn mượt để tránh layout nhảy khi gõ */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          suggestions.length ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="tnum flex-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs transition-colors hover:border-primary"
              >
                {formatVnd(s)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// MoneyInput nối react-hook-form (không dùng field.ref để né lỗi React Compiler).
export function MoneyField<T extends FieldValues>({
  control,
  name,
  id,
  suggest,
  placeholder,
}: {
  control: Control<T>;
  name: Path<T>;
  id?: string;
  suggest?: boolean;
  placeholder?: string;
}) {
  const { field } = useController({ control, name });
  return (
    <MoneyInput
      id={id}
      suggest={suggest}
      placeholder={placeholder}
      value={(field.value as number) ?? 0}
      onChange={field.onChange}
    />
  );
}
