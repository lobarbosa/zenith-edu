"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIAGNOSTIC_KICKOFF_MESSAGE } from "@/lib/agents/diagnostic-kickoff";

type Message = { role: "user" | "assistant"; content: string };

async function streamReply(
  history: Message[],
  onDelta: (chunk: string) => void
) {
  const response = await fetch("/api/diagnostic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Falha ao conversar com o agente.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

export function DiagnosticChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runTurn([{ role: "user", content: DIAGNOSTIC_KICKOFF_MESSAGE }]);
  }, []);

  async function runTurn(history: Message[]) {
    setIsStreaming(true);
    setError(false);
    setMessages([...history, { role: "assistant", content: "" }]);

    try {
      let full = "";
      await streamReply(history, (chunk) => {
        full += chunk;
        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "assistant", content: full };
          return next;
        });
      });
    } catch {
      setError(true);
    } finally {
      setIsStreaming(false);
    }
  }

  function submitMessage() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const history: Message[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setInput("");
    void runTurn(history);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
      <header className="py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Executive Diagnostic
        </p>
      </header>

      <div className="flex-1 space-y-8 pb-8">
        {messages
          .map((message, index) => ({ message, index }))
          .filter(({ message }) => message.content !== DIAGNOSTIC_KICKOFF_MESSAGE)
          .map(({ message, index }) => (
            <div key={index} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {message.role === "user" ? "Você" : "Agente"}
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
          placeholder="Responda aqui..."
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button type="submit" disabled={isStreaming || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
