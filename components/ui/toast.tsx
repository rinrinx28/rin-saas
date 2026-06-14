"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 3500;
const EXIT_MS = 200;

const STYLES: Record<ToastType, { icon: typeof CheckCircle2; accent: string; iconClass: string }> = {
  success: { icon: CheckCircle2, accent: "border-l-success", iconClass: "text-success" },
  error: { icon: XCircle, accent: "border-l-danger", iconClass: "text-danger" },
  info: { icon: Info, accent: "border-l-primary", iconClass: "text-primary" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      info: (m) => show("info", m),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const { icon: Icon, accent, iconClass } = STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border border-l-4 border-border bg-surface px-4 py-3 shadow-lg",
                accent,
                t.exiting
                  ? "animate-out fade-out-0 slide-out-to-right-5 duration-200"
                  : "animate-in fade-in-0 slide-in-from-right-5 duration-300 ease-out",
              )}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} />
              <p className="flex-1 pt-0.5 text-sm text-fg">{t.message}</p>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => dismiss(t.id)}
                className="-mr-1 rounded p-0.5 text-fg-subtle transition-colors hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải dùng trong <ToastProvider>");
  return ctx;
}
