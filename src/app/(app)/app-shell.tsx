"use client";

import { useEffect, useRef, useState } from "react";
import { AppSidebar, type NavItem } from "./app-sidebar";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function AppShell({
  navItems,
  roleLabel,
  userEmail,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-none border-r border-sidebar-border md:block">
        <AppSidebar navItems={navItems} roleLabel={roleLabel} userEmail={userEmail} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            T-Shaped Executive
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            className="rounded-md p-2 text-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MenuIcon />
          </button>
        </div>

        {/* Cada página já traz seu próprio <main> — este é só o container
            de rolagem, pra não duplicar a landmark "main" na árvore. */}
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* flex-col + min-h-0: a barra do botão fechar consome altura, e a
              sidebar (h-full) precisa ocupar só o que sobra. Sem isso ela
              transborda e o rodapé — onde fica o Sair — sai da tela. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-xl"
          >
            <div className="flex flex-none justify-end p-3">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-md p-2 text-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <AppSidebar
                navItems={navItems}
                roleLabel={roleLabel}
                userEmail={userEmail}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
