"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AcceptButton({ menteeId }: { menteeId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/mentor/aceitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menteeId }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    setError(await response.text());
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isSubmitting} size="sm">
        {isSubmitting ? "Aceitando..." : "Aceitar no programa"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Entra na turma e libera FIND. A Jornada, os Mapas e o copiloto passam a existir para
        esta pessoa.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
