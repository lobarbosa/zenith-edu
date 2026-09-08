"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ETAPAS = ["FIND", "UNDERSTAND", "CREATE", "LEAD", "INFLUENCE", "MOVE"];

export function NotesForm({ menteeId, etapaAtual }: { menteeId: string; etapaAtual: string | null }) {
  const router = useRouter();
  const [conteudo, setConteudo] = useState("");
  const [etapa, setEtapa] = useState(etapaAtual ?? ETAPAS[0]);
  const [visivelAoMentorado, setVisivelAoMentorado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (conteudo.trim().length === 0) {
      setError("O conteúdo é obrigatório.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/mentor/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menteeId, etapa, conteudo: conteudo.trim(), visivelAoMentorado }),
    });

    if (response.ok) {
      setConteudo("");
      setVisivelAoMentorado(false);
      router.refresh();
      setIsSubmitting(false);
      return;
    }

    setError(await response.text());
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={conteudo}
        onChange={(event) => setConteudo(event.target.value)}
        placeholder="Nota após o encontro..."
        rows={3}
        disabled={isSubmitting}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={etapa}
          onChange={(event) => setEtapa(event.target.value)}
          disabled={isSubmitting}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {ETAPAS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={visivelAoMentorado}
            onChange={(event) => setVisivelAoMentorado(event.target.checked)}
            disabled={isSubmitting}
          />
          Visível ao mentorado
        </label>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar nota"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
