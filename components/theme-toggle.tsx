"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Đổi giao diện sáng/tối"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Hiện theo class .dark — SSR-safe, không cần effect/mounted */}
      <Sun className="hidden size-4.5 dark:block" />
      <Moon className="size-4.5 dark:hidden" />
    </Button>
  );
}
