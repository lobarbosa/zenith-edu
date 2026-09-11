"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CHAT_META_MARKER } from "@/lib/agents/chat-meta";
import { AGENT_LABELS } from "@/lib/agents/agent-labels";
import { ALLOWED_MIME_TYPES, ALLOWED_MIME_LABEL, MAX_FILES_PER_MESSAGE } from "@/lib/attachments/limits";

type Message = { role: "user" | "assistant"; content: string; agentKey?: string };
type ChatMeta = { agentKey: string };
type PendingAttachment = { id: string; nomeArquivo: string };

async function streamReply(
  message: string,
  attachmentIds: string[],
  onDelta: (chunk: string) => void
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, attachmentIds }),
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

// "page" é a tela /copiloto; "panel" é o mesmo chat dentro do widget
// flutuante (SPEC visual: o copiloto acompanha o mentorado em qualquer
// tela). Só o enquadramento muda — streaming, anexos e erro são um código
// só, pra não existirem duas conversas que divergem.
export function CopilotoChat({
  initialMessages,
  variant = "page",
}: {
  initialMessages: Message[];
  variant?: "page" | "panel";
}) {
  const isPanel = variant === "panel";
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function runTurn(userText: string, attachmentIds: string[]) {
    setIsStreaming(true);
    setError(false);

    setMessages((current) => [
      ...current,
      { role: "user", content: userText },
      { role: "assistant", content: "" },
    ]);

    try {
      const meta = await streamReply(userText, attachmentIds, (text) => {
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
    const attachmentIds = pendingAttachments.map((a) => a.id);
    setPendingAttachments([]);
    void runTurn(trimmed, attachmentIds);
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setAttachError(null);

    const files = Array.from(fileList).slice(
      0,
      Math.max(0, MAX_FILES_PER_MESSAGE - pendingAttachments.length)
    );
    if (files.length < fileList.length) {
      setAttachError(`No máximo ${MAX_FILES_PER_MESSAGE} anexos por mensagem.`);
    }

    setIsUploading(true);
    for (const file of files) {
      if (!(file.type in ALLOWED_MIME_TYPES)) {
        setAttachError(`Formato não aceito. Envie um destes: ${ALLOWED_MIME_LABEL}.`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/attachments", { method: "POST", body: formData });
      if (!response.ok) {
        setAttachError(await response.text());
        continue;
      }

      const { attachment } = await response.json();
      setPendingAttachments((current) => [
        ...current,
        { id: attachment.id, nomeArquivo: attachment.nome_arquivo },
      ]);
    }
    setIsUploading(false);
  }

  function removeAttachment(id: string) {
    setPendingAttachments((current) => current.filter((a) => a.id !== id));
  }

  return (
    <div
      className={
        isPanel
          ? "flex min-h-0 w-full flex-1 flex-col px-4"
          : "shell-narrow flex flex-1 flex-col px-6"
      }
    >
      {!isPanel && (
        <header className="py-10">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Copiloto
          </p>
        </header>
      )}

      <div className={isPanel ? "min-h-0 flex-1 space-y-5 overflow-y-auto py-4" : "flex-1 space-y-8 pb-8"}>
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
            <p
              className={`whitespace-pre-wrap leading-relaxed text-foreground ${
                isPanel ? "text-sm" : "text-base"
              }`}
            >
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
        className={
          isPanel
            ? "flex-none space-y-2 border-t border-border bg-background py-3"
            : "sticky bottom-0 space-y-3 border-t border-border bg-background py-6"
        }
      >
        {pendingAttachments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {pendingAttachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-foreground"
              >
                {attachment.nomeArquivo}
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`Remover ${attachment.nomeArquivo}`}
                  className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {attachError && <p className="text-xs text-destructive">{attachError}</p>}

        <div className="flex items-end gap-3">
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
            rows={isPanel ? 1 : 2}
            placeholder="Escreva aqui..."
            aria-label="Sua mensagem para o copiloto"
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.keys(ALLOWED_MIME_TYPES).join(",")}
            onChange={(event) => {
              void handleFilesSelected(event.target.files);
              event.target.value = "";
            }}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size={isPanel ? "sm" : "default"}
            disabled={isStreaming || isUploading || pendingAttachments.length >= MAX_FILES_PER_MESSAGE}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? "Enviando..." : "Anexar"}
          </Button>
          <Button type="submit" size={isPanel ? "sm" : "default"} disabled={isStreaming || !input.trim()}>
            Enviar
          </Button>
        </div>
      </form>
    </div>
  );
}
