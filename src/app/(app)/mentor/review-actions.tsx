"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ReviewActionsProps =
  | { profileId: string; artifactId?: never }
  | { profileId?: never; artifactId: string };

export function ReviewActions({ profileId, artifactId }: ReviewActionsProps) {
  const router = useRouter();
  const [isRejecting, setIsRejecting] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(path: string, extra: Record<string, string>) {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(profileId ? { profileId } : { artifactId }), ...extra }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    setError(await response.text());
    setIsSubmitting(false);
  }

  async function handleReject() {
    if (motivo.trim().length === 0) {
      setError("O motivo é obrigatório.");
      return;
    }
    await submit("/api/mentor/reject", { motivo: motivo.trim() });
  }

  if (isRejecting) {
    return (
      <div className="space-y-2">
        <textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Motivo da rejeição — o mentorado vai ver este texto"
          rows={3}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Rejeitando..." : "Confirmar rejeição"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRejecting(false);
              setMotivo("");
              setError(null);
            }}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => submit("/api/mentor/validate", {})} disabled={isSubmitting} size="sm">
        {isSubmitting ? "Validando..." : "Validar"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="border-destructive text-destructive hover:bg-destructive/10"
        onClick={() => setIsRejecting(true)}
        disabled={isSubmitting}
      >
        Rejeitar
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
