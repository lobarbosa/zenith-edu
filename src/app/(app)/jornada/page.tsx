import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { ensureJourneyState, agentEtapa } from "@/lib/agents/journey";
import {
  ARTIFACT_TIPOS,
  ARTIFACT_LABELS,
  ARTIFACT_AGENT,
  type ArtifactTipo,
} from "@/lib/agents/artifact-schemas";
import { StatusPill } from "@/components/status-pill";
import { ArtifactDetail } from "@/components/artifact-detail";
import { GenerateArtifactButton } from "./generate-artifact-button";
import { EtapaStepper } from "./etapa-stepper";

type ArtifactRow = {
  id: string;
  tipo: ArtifactTipo;
  versao: number;
  status: "rascunho_agente" | "validado_mentor" | "rejeitado";
  conteudo: unknown;
  motivo_rejeicao: string | null;
};

const STATUS_LABEL = {
  rascunho_agente: "Em revisão do mentor",
  validado_mentor: "Validado",
  rejeitado: "Rejeitado pelo mentor",
};
const STATUS_TONE = { rascunho_agente: "warning", validado_mentor: "good", rejeitado: "bad" } as const;

export default async function JornadaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await ensureMentee(supabase, user!);
  const admin = createAdminClient();
  const journey = await ensureJourneyState(admin, mentee.id);

  const { data: artifacts } = await supabase
    .from("artifacts")
    .select("id, tipo, versao, status, conteudo, motivo_rejeicao")
    .eq("mentee_id", mentee.id)
    .order("versao", { ascending: false });

  const latestByTipo = new Map<ArtifactTipo, ArtifactRow>();
  for (const item of (artifacts ?? []) as ArtifactRow[]) {
    if (!latestByTipo.has(item.tipo)) {
      latestByTipo.set(item.tipo, item);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Jornada</p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        {journey.etapa_atual}{" "}
        <span className="font-normal text-muted-foreground">· mês {journey.mes} de 6</span>
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        O avanço de etapa é conduzido pelo seu mentor, após cada encontro mensal.
      </p>

      <EtapaStepper etapaAtual={journey.etapa_atual} etapasLiberadas={journey.etapas_liberadas} />

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href="/copiloto"
          className="text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          Conversar com o copiloto →
        </Link>
        <Link
          href="/biblioteca"
          className="text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          Biblioteca →
        </Link>
      </div>

      <h2 className="mb-6 mt-12 text-lg font-semibold tracking-tight text-foreground">
        Artefatos desta etapa
      </h2>

      <div className="space-y-10">
        {ARTIFACT_TIPOS.filter((tipo) => agentEtapa(ARTIFACT_AGENT[tipo]) === journey.etapa_atual).map(
          (tipo) => {
            const latest = latestByTipo.get(tipo);

            return (
              <section
                key={tipo}
                className="space-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{ARTIFACT_LABELS[tipo]}</p>
                    <StatusPill tone={latest ? STATUS_TONE[latest.status] : "neutral"}>
                      {latest ? STATUS_LABEL[latest.status] : "Ainda não gerado"}
                    </StatusPill>
                  </div>
                  {(!latest ||
                    latest.status === "validado_mentor" ||
                    latest.status === "rejeitado") && (
                    <GenerateArtifactButton tipo={tipo} label={latest ? "Gerar nova versão" : "Gerar"} />
                  )}
                </div>

                {latest?.status === "rejeitado" && latest.motivo_rejeicao && (
                  <p className="text-sm text-bad">Motivo da rejeição: {latest.motivo_rejeicao}</p>
                )}
                {latest?.status === "validado_mentor" && (
                  <ArtifactDetail tipo={tipo} conteudo={latest.conteudo} />
                )}
                {!latest && (
                  <p className="text-sm text-muted-foreground">
                    Converse com o copiloto sobre este tema e depois peça pra gerar.
                  </p>
                )}
              </section>
            );
          }
        )}
      </div>
    </main>
  );
}
