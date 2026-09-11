"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

export type NavItem = { href: string; label: string };

function navItemClass(active: boolean) {
  return `block truncate rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
  }`;
}

export function AppSidebar({
  navItems,
  roleLabel,
  userEmail,
  onNavigate,
}: {
  navItems: NavItem[];
  roleLabel: string;
  userEmail: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-5 pt-6 pb-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="text-sm font-semibold tracking-tight text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          T-Shaped Executive
        </Link>
      </div>

      {/* min-h-0 + overflow: em tela baixa a lista rola, em vez de empurrar o
          rodapé (e-mail, Conta, Sair) pra fora da viewport. */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {roleLabel}
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={navItemClass(active)}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-none space-y-2 border-t border-sidebar-border px-3 py-4">
        <p className="truncate px-3 text-xs text-muted-foreground">{userEmail}</p>
        <Link href="/conta" onClick={onNavigate} className={navItemClass(pathname === "/conta")}>
          Conta
        </Link>
        <div className="px-3 pt-1">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
