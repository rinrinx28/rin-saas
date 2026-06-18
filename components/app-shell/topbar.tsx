import { Search } from "lucide-react";
import { ContextSwitcher } from "@/components/app-shell/context-switcher";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { ACTIVE_ORG_COOKIE, ACTIVE_STORE_COOKIE } from "@/lib/constants";

interface Option {
  id: string;
  name: string;
}

interface TopbarProps {
  orgs: Option[];
  stores: Option[];
  activeOrgId: string;
  activeStoreId?: string;
  userName: string;
  userEmail: string;
}

export function Topbar({
  orgs,
  stores,
  activeOrgId,
  activeStoreId,
  userName,
  userEmail,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
      <ContextSwitcher
        label="Cửa hàng"
        options={orgs}
        activeId={activeOrgId}
        cookieName={ACTIVE_ORG_COOKIE}
        alsoClear={[ACTIVE_STORE_COOKIE]}
        navPattern="/s/:id/dashboard"
      />
      <ContextSwitcher
        label="Chi nhánh"
        options={stores}
        activeId={activeStoreId}
        cookieName={ACTIVE_STORE_COOKIE}
        className="hidden sm:flex"
      />

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
        <Input placeholder="Tìm sản phẩm, đơn hàng…" className="w-64 pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:ml-2">
        <ThemeToggle />
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
