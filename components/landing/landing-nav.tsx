import { Boxes } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#features", label: "Tính năng" },
  { href: "#showcase", label: "Trải nghiệm" },
  { href: "#pricing", label: "Bảng giá" },
];

export function LandingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/70 backdrop-blur-xl">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5"
      >
        <Link href="/" className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <span className="font-display text-lg font-semibold tracking-tight">rin·saas</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthed ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Vào ứng dụng</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Dùng thử miễn phí</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
