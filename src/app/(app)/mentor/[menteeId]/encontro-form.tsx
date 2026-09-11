"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EncontroForm({
  menteeId,
  proximoEncontro,
}: {
  menteeId: string;
  proximoEncontro: string | null;
}) {
  const router = useRouter();
  const [data, setData] = useState(proximoEncontro ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar(valor: string) {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/mentor/encontro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menteeId, data: valor }),
    });

    if (response.ok) {
      setData(valor);
      router.refresh();
      setIsSubmitting(false);
      return;
    }

    setError(await response.text());
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-2">
      <label htmlFor="proximo-encontro" className="block text-sm font-medium text-foreground">
        Próximo encontro
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="proximo-encontro"
          type="date"
          value={data}
          onChange={(event) => setData(event.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void salvar(data)}
          disabled={isSubmitting || data === (proximoEncontro ?? "")}
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
        {proximoEncontro && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void salvar("")}
            disabled={isSubmitting}
          >
            Limpar
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        A data aparece na Jornada do mentorado, com a contagem de dias.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
