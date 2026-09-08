"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "loading" | "done" | "error";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setStatus(error ? "error" : "done");
    if (!error) setPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="flex-1 space-y-1">
        <Input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="Nova senha"
        />
        {status === "error" && (
          <p className="text-xs text-destructive">Não foi possível salvar. Tente novamente.</p>
        )}
        {status === "done" && <p className="text-xs text-good">Senha atualizada.</p>}
      </div>
      <Button type="submit" size="sm" disabled={status === "loading"}>
        {status === "loading" ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
