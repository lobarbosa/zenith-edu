"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CopilotoChat } from "@/app/(app)/copiloto/copiloto-chat";

type Message = { role: "user" | "assistant"; content: string; agentKey?: string };

const HISTORY_LIMIT = 40;

// A tela /copiloto já é a conversa inteira, e o diagnóstico é um fluxo
// fechado de 8 blocos que não admite um segundo agente por cima.
const HIDDEN_ON = ["/copiloto", "/diagnostico"];

function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
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

export function CopilotoWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Carrega uma vez, na primeira abertura: o layout roda em toda navegação e
  // não pode pagar essa query. RLS já escopa as linhas ao próprio mentorado.
  useEffect(() => {
    if (!open || messages !== null) return;
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select("role, content, agent_key")
        .not("conversation_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

      if (cancelled) return;
      setMessages(
        (data ?? [])
          .slice()
          .reverse()
          .map((m: { role: string; content: string; agent_key: string | null }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            agentKey: m.agent_key ?? undefined,
          }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [open, messages]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  function close() {
    setOpen(false);
    fabRef.current?.focus();
  }

  return (
    <>
      {/* z-40 fica abaixo do menu off-canvas (z-50): com o menu aberto, o
          widget não disputa o toque nem cobre o foco dentro do drawer. */}
      <button
        ref={fabRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Fechar copiloto" : "Abrir copiloto"}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
        style={{ height: 52, width: 52 }}
      >
        {open ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Conversa com o copiloto"
          className="fixed bottom-[88px] right-6 z-40 flex max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl outline-none"
          style={{ width: 380, height: "min(600px, calc(100vh - 140px))" }}
        >
          <div className="flex flex-none items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Copiloto</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                As etapas abrem conforme você avança com o mentor.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar copiloto"
              className="flex-none rounded-md p-1.5 text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <CloseIcon />
            </button>
          </div>

          {messages === null ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Carregando a conversa...</p>
          ) : (
            <CopilotoChat initialMessages={messages} variant="panel" />
          )}
        </div>
      )}
    </>
  );
}
