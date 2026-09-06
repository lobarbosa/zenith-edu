"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DIAGNOSTIC_KICKOFF_MESSAGE,
  DIAGNOSTIC_META_MARKER,
} from "@/lib/agents/diagnostic-kickoff";

type Message = { role: "user" | "assistant"; content: string };
type DiagnosticMeta = { bloco: number; concluido: boolean };

async function streamReply(
  sessionId: string,
  message: string | null,
  onDelta: (chunk: string) => void
) {
  const response = await fetch("/api/diagnostic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Falha ao conversar com o agente.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const markerIndex = full.indexOf(DIAGNOSTIC_META_MARKER);
    onDelta(markerIndex === -1 ? full : full.slice(0, markerIndex));
  }

  const markerIndex = full.indexOf(DIAGNOSTIC_META_MARKER);
  if (markerIndex === -1) return null;

  try {
    return JSON.parse(full.slice(markerIndex + DIAGNOSTIC_META_MARKER.length)) as DiagnosticMeta;
  } catch {
    return null;
  }
}

export function DiagnosticChat({
  sessionId,
  initialMessages,
}: {
  sessionId: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (started.current || initialMessages.length > 0) return;
    started.current = true;
    void runTurn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runTurn(userText: string | null) {
    setIsStreaming(true);
    setError(false);

    setMessages((current) => [
      ...current,
      ...(userText ? [{ role: "user" as const, content: userText }] : []),
      { role: "assistant" as const, content: "" },
    ]);

    try {
      const meta = await streamReply(sessionId, userText, (text) => {
        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "assistant", content: text };
          return next;
        });
      });

      if (meta?.concluido) {
        router.refresh();
      }
    } catch {
      setError(true);
    } finally {
      setIsStreaming(false);
    }
  }

  function submitMessage() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    void runTurn(trimmed);
  }

  const visibleMessages = messages.filter(
    (message) => message.content !== DIAGNOSTIC_KICKOFF_MESSAGE
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
      <header className="py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Executive Diagnostic
        </p>
      </header>

      <div className="flex-1 space-y-8 pb-8">
        {visibleMessages.map((message, index) => (
          <div key={index} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {message.role === "user" ? "Você" : "Agente"}
            </p>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
              {message.content || (isStreaming && index === visibleMessages.length - 1 ? "..." : "")}
            </p>
          </div>
        ))}

        {error && (
          <p className="text-sm text-destructive">
            Não foi possível obter resposta. Tente enviar novamente.
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
        className="sticky bottom-0 flex items-end gap-3 border-t border-border bg-background py-6"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitMessage();
            }
          }}
          disabled={isStreaming}
          rows={2}
          placeholder="Responda aqui..."
          aria-label="Sua resposta ao Executive Diagnostic"
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button type="submit" disabled={isStreaming || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
