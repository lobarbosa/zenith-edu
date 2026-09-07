"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdvanceButton({ menteeId, label }: { menteeId: string; label: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/mentor/advance", {
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
      <Button onClick={handleClick} disabled={isSubmitting} variant="outline" size="sm">
        {isSubmitting ? "Avançando..." : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
