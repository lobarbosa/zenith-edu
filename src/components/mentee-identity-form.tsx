"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MenteeIdentityValues = {
  nome: string | null;
  sobrenome: string | null;
  data_nascimento: string | null;
  cargo: string | null;
  empresa: string | null;
  linkedin: string | null;
  telefone: string | null;
  carreira_inicio_ano: number | null;
};

// As colunas vêm todas nullable do banco (0007) e o formulário trabalha com
// string. Este normaliza a linha lida — inclusive `null`, para quem ainda
// não tem linha — no formato que o formulário espera.
export function toIdentityValues(row: Partial<MenteeIdentityValues> | null): MenteeIdentityValues {
  return {
    nome: row?.nome ?? null,
    sobrenome: row?.sobrenome ?? null,
    data_nascimento: row?.data_nascimento ?? null,
    cargo: row?.cargo ?? null,
    empresa: row?.empresa ?? null,
    linkedin: row?.linkedin ?? null,
    telefone: row?.telefone ?? null,
    carreira_inicio_ano: row?.carreira_inicio_ano ?? null,
  };
}

type Campo = {
  name: keyof MenteeIdentityValues;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  half?: boolean;
};

const CAMPOS: Campo[] = [
  { name: "nome", label: "Nome", required: true, half: true },
  { name: "sobrenome", label: "Sobrenome", required: true, half: true },
  { name: "cargo", label: "Cargo atual", required: true, half: true },
  { name: "empresa", label: "Empresa", half: true },
  { name: "data_nascimento", label: "Data de nascimento", type: "date", half: true },
  {
    name: "carreira_inicio_ano",
    label: "Ano de início da carreira",
    type: "number",
    half: true,
    hint: "O ano do seu primeiro trabalho na área.",
  },
  { name: "linkedin", label: "LinkedIn", half: true },
  { name: "telefone", label: "Telefone", type: "tel", half: true },
];

export function MenteeIdentityForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: MenteeIdentityValues;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS.map((campo) => [campo.name, String(initial[campo.name] ?? "")]))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/mentee/perfil", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setError(await response.text());
      setIsSubmitting(false);
      return;
    }

    setSaved(true);
    setIsSubmitting(false);
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((campo) => (
          <div key={campo.name} className={campo.half ? "space-y-1.5" : "space-y-1.5 sm:col-span-2"}>
            <Label htmlFor={`identidade-${campo.name}`}>
              {campo.label}
              {!campo.required && (
                <span className="ml-1.5 font-normal text-muted-foreground">opcional</span>
              )}
            </Label>
            <Input
              id={`identidade-${campo.name}`}
              name={campo.name}
              type={campo.type ?? "text"}
              required={campo.required}
              value={values[campo.name] ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [campo.name]: event.target.value }))
              }
            />
            {campo.hint && <p className="text-xs text-muted-foreground">{campo.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
        {saved && <p className="text-xs text-muted-foreground">Salvo.</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
