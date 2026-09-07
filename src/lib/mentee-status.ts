export type Session = {
  status: "em_andamento" | "concluida";
  current_block: number;
} | null;

export type Profile = {
  status: "rascunho_agente" | "validado" | "rejeitado";
  version: number;
} | null;

export function menteeStatus(session: Session, profile: Profile) {
  if (profile?.status === "validado") {
    return { label: "Perfil validado", tone: "good" as const };
  }
  if (profile?.status === "rejeitado") {
    return { label: "Perfil rejeitado pelo mentor", tone: "bad" as const };
  }
  if (session?.status === "concluida") {
    return { label: "Aguardando validação", tone: "warning" as const };
  }
  if (session?.status === "em_andamento") {
    return { label: `Diagnóstico em andamento — bloco ${session.current_block} de 8`, tone: "neutral" as const };
  }
  return { label: "Diagnóstico não iniciado", tone: "neutral" as const };
}
