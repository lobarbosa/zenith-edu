"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/account/delete", { method: "POST" });

    if (!response.ok) {
      setError(await response.text());
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!isConfirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-destructive text-destructive hover:bg-destructive/10"
        onClick={() => setIsConfirming(true)}
      >
        Excluir meus dados
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-destructive/40 p-4">
      <p className="text-sm text-foreground">
        Isso apaga permanentemente sua conta, suas conversas, seu Perfil Executivo e todos os
        artefatos gerados. Não é possível desfazer.
      </p>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Excluindo..." : "Confirmar exclusão"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsConfirming(false)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
