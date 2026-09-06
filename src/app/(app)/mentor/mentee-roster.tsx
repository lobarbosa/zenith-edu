import { StatusPill } from "@/components/status-pill";

type Session = {
  status: "em_andamento" | "concluida";
  current_block: number;
} | null;

type Profile = {
  status: "rascunho_agente" | "validado";
  version: number;
} | null;

export type RosterEntry = {
  mentee: { id: string; email: string };
  session: Session;
  profile: Profile;
};

function menteeStatus(session: Session, profile: Profile) {
  if (profile?.status === "validado") {
    return { label: "Perfil validado", tone: "good" as const };
  }
  if (session?.status === "concluida") {
    return { label: "Aguardando validação", tone: "warning" as const };
  }
  if (session?.status === "em_andamento") {
    return { label: `Diagnóstico em andamento — bloco ${session.current_block} de 8`, tone: "neutral" as const };
  }
  return { label: "Diagnóstico não iniciado", tone: "neutral" as const };
}

export function MenteeRoster({ roster }: { roster: RosterEntry[] }) {
  if (roster.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum mentorado ainda.</p>;
  }

  return (
    <div>
      {roster.map(({ mentee, session, profile }) => {
        const status = menteeStatus(session, profile);
        return (
          <div
            key={mentee.id}
            className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{mentee.email}</p>
              <p className="text-xs text-muted-foreground">Founding Cohort</p>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <span className="text-xs text-muted-foreground">perfil v{profile.version}</span>
              )}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
          </div>
        );
      })}
    </div>
  );
}
