"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ValidateButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);
    setError(false);

    const response = await fetch("/api/mentor/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    setError(true);
    setIsSubmitting(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isSubmitting} size="sm">
        {isSubmitting ? "Validando..." : "Validar"}
      </Button>
      {error && <span className="text-xs text-destructive">Falha ao validar. Tente de novo.</span>}
    </div>
  );
}
