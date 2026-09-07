"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CHAT_META_MARKER } from "@/lib/agents/chat-meta";
import { AGENT_LABELS } from "@/lib/agents/agent-labels";

type Message = { role: "user" | "assistant"; content: string; agentKey?: string };
type ChatMeta = { agentKey: string };

async function streamReply(message: string, onDelta: (chunk: string) => void) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Falha ao conversar com o copiloto.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const markerIndex = full.indexOf(CHAT_META_MARKER);
    onDelta(markerIndex === -1 ? full : full.slice(0, markerIndex));
  }

  const markerIndex = full.indexOf(CHAT_META_MARKER);
  if (markerIndex === -1) return null;

  try {
    return JSON.parse(full.slice(markerIndex + CHAT_META_MARKER.length)) as ChatMeta;
  } catch {
    return null;
  }
}

export function CopilotoChat({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function runTurn(userText: string) {
    setIsStreaming(true);
    setError(false);

    setMessages((current) => [
      ...current,
      { role: "user", content: userText },
      { role: "assistant", content: "" },
    ]);

    try {
      const meta = await streamReply(userText, (text) => {
        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "assistant", content: text };
          return next;
        });
      });

      if (meta?.agentKey) {
        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = { ...next[next.length - 1], agentKey: meta.agentKey };
          return next;
        });
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <header className="py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Copiloto
        </p>
      </header>

      <div className="flex-1 space-y-8 pb-8">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Traga uma situação concreta — a próxima cadeira que você mira, uma competência que
            precisa demonstrar, um trade-off que está avaliando. O copiloto parte do seu Perfil
            Executivo.
          </p>
        )}

        {messages.map((message, index) => (
          <div key={index} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {message.role === "user"
                ? "Você"
                : (message.agentKey && AGENT_LABELS[message.agentKey]) || "Copiloto"}
            </p>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
              {message.content || (isStreaming && index === messages.length - 1 ? "..." : "")}
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
          placeholder="Escreva aqui..."
          aria-label="Sua mensagem para o copiloto"
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button type="submit" disabled={isStreaming || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
