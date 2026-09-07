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
      <LogoutButton />
    </header>
  );
}
