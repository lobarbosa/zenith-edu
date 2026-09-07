import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        T-Shaped Executive
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/conta"
          className="text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          Conta
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
