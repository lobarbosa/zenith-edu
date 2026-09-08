"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SinalActions({ flagId }: { flagId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkRead() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/mentor/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagId }),
    });

    if (response.ok) {
      router.refresh();
      return;
    }

    setError(await response.text());
    setIsSubmitting(false);
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={handleMarkRead} disabled={isSubmitting}>
        {isSubmitting ? "Marcando..." : "Marcar como lido"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
