"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { PanelLeft } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { SIDEBAR_COOKIE } from "@/lib/constants";
import { setCookie } from "@/lib/cookies";
import { navGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";

const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 72;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface SidebarProps {
  defaultCollapsed?: boolean;
}

export function Sidebar({ defaultCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const asideRef = useRef<HTMLElement>(null);
  const isFirstRun = useRef(true);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    setCookie(SIDEBAR_COOKIE, collapsed ? "0" : "1");
    setCollapsed((v) => !v);
  }

  const hrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = hrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  // Entrance khi mount: sidebar trượt nhẹ + nav item stagger (ADR 0006)
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(asideRef.current, {
        autoAlpha: 0,
        x: -16,
        duration: 0.4,
        ease: "power2.out",
      });
      gsap.from("[data-nav-item]", {
        autoAlpha: 0,
        x: -10,
        stagger: 0.03,
        duration: 0.3,
        delay: 0.08,
        ease: "power2.out",
      });
    },
    { scope: asideRef },
  );

  // Thu gọn/mở rộng: animate width + fade label (ADR 0006).
  // Lần đầu (khôi phục từ cookie) đặt tức thì, không animate → tránh nháy.
  useGSAP(
    () => {
      const instant = isFirstRun.current || prefersReducedMotion();
      isFirstRun.current = false;
      gsap.to(asideRef.current, {
        width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
        duration: instant ? 0 : 0.3,
        ease: "power2.inOut",
      });
      const labels = asideRef.current?.querySelectorAll("[data-collapsible]");
      if (labels) {
        gsap.to(labels, {
          autoAlpha: collapsed ? 0 : 1,
          duration: instant ? 0 : collapsed ? 0.12 : 0.2,
          ease: "power2.out",
        });
      }
    },
    { dependencies: [collapsed], scope: asideRef },
  );

  return (
    <aside
      ref={asideRef}
      style={{ width: defaultCollapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
      className="hidden shrink-0 flex-col overflow-hidden border-r border-border bg-surface md:flex"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-5">
        <LogoMark className="size-5 shrink-0 text-primary" />
        <span
          data-collapsible
          className="whitespace-nowrap font-display text-lg font-semibold tracking-tight"
        >
          rin·saas
        </span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `g-${gi}`} className="space-y-1">
            {group.label &&
              (collapsed ? (
                <div className="mx-1 my-2 h-px bg-border" />
              ) : (
                <p
                  data-collapsible
                  className="whitespace-nowrap px-2 pb-1 text-xs font-medium uppercase tracking-wider text-fg-subtle"
                >
                  {group.label}
                </p>
              ))}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-nav-item
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 overflow-hidden rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-primary-bg text-primary"
                      : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span data-collapsible className="truncate whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-pressed={collapsed}
          className="flex w-full items-center gap-2.5 overflow-hidden rounded-md px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
        >
          <PanelLeft
            className={cn(
              "size-4 shrink-0 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
          <span data-collapsible className="truncate whitespace-nowrap">
            Thu gọn
          </span>
        </button>
      </div>
    </aside>
  );
}
