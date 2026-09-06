type Message = { role: "user" | "assistant"; content: string; block: number };

export function Transcript({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>;
  }

  return (
    <div className="space-y-6">
      {messages.map((m, i) => (
        <div key={i}>
          <p className="text-xs font-medium text-muted-foreground">
            {m.role === "user" ? "Mentorado" : "Agente"}{" "}
            <span className="text-muted-foreground/70">· bloco {m.block}</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {m.content}
          </p>
        </div>
      ))}
    </div>
  );
}
