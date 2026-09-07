import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ExecutiveProfileSchema } from "@/lib/agents/executive-profile-schema";
import { ARTIFACT_TIPOS, ARTIFACT_LABELS, type ArtifactTipo } from "@/lib/agents/artifact-schemas";
import { StatusPill } from "@/components/status-pill";
import { ArtifactDetail } from "@/components/artifact-detail";
import { menteeStatus } from "@/lib/mentee-status";
import { ensureJourneyState, ETAPA_ORDER } from "@/lib/agents/journey";
import { ATTACHMENTS_BUCKET } from "@/lib/attachments/limits";
import { EtapaStepper } from "../../jornada/etapa-stepper";
import { ProfileDetail } from "../profile-detail";
import { ReviewActions } from "../review-actions";
import { Transcript } from "../transcript";
import { AdvanceButton } from "./advance-button";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type ArtifactRow = {
  id: string;
  tipo: ArtifactTipo;
  versao: number;
  status: "rascunho_agente" | "validado_mentor" | "rejeitado";
  conteudo: unknown;
  criado_em: string;
  validado_em: string | null;
  motivo_rejeicao: string | null;
};

const ARTIFACT_STATUS_LABEL = {
  rascunho_agente: "Rascunho do agente",
  validado_mentor: "Validado",
  rejeitado: "Rejeitado",
};
const ARTIFACT_STATUS_TONE = {
  rascunho_agente: "warning",
  validado_mentor: "good",
  rejeitado: "bad",
} as const;

const STATUS_LABEL = { rascunho_agente: "Rascunho do agente", validado: "Validado", rejeitado: "Rejeitado" };
const STATUS_TONE = { rascunho_agente: "warning", validado: "good", rejeitado: "bad" } as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function MenteeDetailPage(props: PageProps<"/mentor/[menteeId]">) {
  const { menteeId } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O proxy.ts já faz essa checagem antes de chegar aqui — é só uma
  // camada de UX. Esta é a checagem que decide se o client admin é usado.
  if (!user || !isMentor(user.email)) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: mentee } = await admin
    .from("mentees")
    .select("id, email, created_at")
    .eq("id", menteeId)
    .maybeSingle();

  if (!mentee) {
    notFound();
  }

  const { data: session } = await admin
    .from("diagnostic_sessions")
    .select(
      "id, status, current_block, started_at, completed_at, input_tokens, output_tokens, custo_usd"
    )
    .eq("mentee_id", menteeId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: messages } = session
    ? await admin
        .from("messages")
        .select("role, content, block")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const journey = await ensureJourneyState(admin, menteeId);
  const journeyIndex = ETAPA_ORDER.indexOf(journey.etapa_atual as (typeof ETAPA_ORDER)[number]);
  const nextEtapa = journeyIndex < ETAPA_ORDER.length - 1 ? ETAPA_ORDER[journeyIndex + 1] : null;

  const { data: profiles } = await admin
    .from("executive_profiles")
    .select("id, version, status, perfil, created_at, validated_at, motivo_rejeicao")
    .eq("mentee_id", menteeId)
    .order("version", { ascending: false });

  const { data: artifactRows } = await admin
    .from("artifacts")
    .select("id, tipo, versao, status, conteudo, criado_em, validado_em, motivo_rejeicao")
    .eq("mentee_id", menteeId)
    .order("versao", { ascending: false });

  // Anexos: privados ao mentorado, o mentor enxerga ao revisar aqui
  // (SPEC-AGENTS.md §12, "Visibilidade"). URL assinada gerada agora — o
  // bucket é privado, nunca URL pública.
  const { data: attachmentRows } = await admin
    .from("attachments")
    .select("id, nome_arquivo, tipo_mime, tamanho_bytes, storage_path, criado_em")
    .eq("mentee_id", menteeId)
    .order("criado_em", { ascending: false });

  const attachments = await Promise.all(
    (attachmentRows ?? []).map(async (row) => {
      const { data: signed } = await admin.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(row.storage_path, 3600);
      return { ...row, signedUrl: signed?.signedUrl ?? null };
    })
  );

  const artifactsByTipo = new Map<ArtifactTipo, ArtifactRow[]>();
  for (const item of (artifactRows ?? []) as ArtifactRow[]) {
    const list = artifactsByTipo.get(item.tipo) ?? [];
    list.push(item);
    artifactsByTipo.set(item.tipo, list);
  }

  const latestProfile = profiles?.[0]
    ? { status: profiles[0].status, version: profiles[0].version }
    : null;
  const status = menteeStatus(
    session ? { status: session.status, current_block: session.current_block } : null,
    latestProfile
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/mentor" className="text-xs text-muted-foreground hover:text-foreground">
        ← Meus mentorados
      </Link>

      <div className="mt-4 mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Founding Cohort
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {mentee.email}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            mentorado desde {formatDate(mentee.created_at)}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Jornada</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {journey.etapa_atual} · mês {journey.mes} de 6
        </p>
        <EtapaStepper etapaAtual={journey.etapa_atual} etapasLiberadas={journey.etapas_liberadas} />
        <div className="mt-4">
          {nextEtapa ? (
            <AdvanceButton menteeId={menteeId} label={`Avançar para ${nextEtapa}`} />
          ) : (
            <p className="text-xs text-muted-foreground">Já está na última etapa (MOVE).</p>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Executive Diagnostic
        </h2>
        {!session ? (
          <p className="text-sm text-muted-foreground">Ainda não iniciou o diagnóstico.</p>
        ) : (
          <>
            <dl className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Iniciado em</dt>
                <dd className="font-medium text-foreground">{formatDate(session.started_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Concluído em</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(session.completed_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tokens</dt>
                <dd className="font-medium text-foreground">
                  {(session.input_tokens + session.output_tokens).toLocaleString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Custo</dt>
                <dd className="font-medium text-foreground">
                  US$ {Number(session.custo_usd).toFixed(4)}
                </dd>
              </div>
            </dl>
            <Transcript messages={messages ?? []} />
          </>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Perfil Executivo
        </h2>
        {!profiles || profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não foi sintetizado.</p>
        ) : (
          <div className="space-y-10">
            {profiles.map((item) => {
              const parsed = ExecutiveProfileSchema.safeParse(item.perfil);
              return (
                <div
                  key={item.id}
                  className="space-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        versão {item.version}
                      </p>
                      <StatusPill tone={STATUS_TONE[item.status as keyof typeof STATUS_TONE]}>
                        {STATUS_LABEL[item.status as keyof typeof STATUS_LABEL]}
                      </StatusPill>
                    </div>
                    {item.status === "rascunho_agente" && <ReviewActions profileId={item.id} />}
                  </div>
                  {item.status === "rejeitado" && item.motivo_rejeicao && (
                    <p className="text-sm text-bad">Motivo da rejeição: {item.motivo_rejeicao}</p>
                  )}
                  {parsed.success ? (
                    <ProfileDetail perfil={parsed.data} />
                  ) : (
                    <p className="text-sm text-destructive">
                      Este registro não bate com o schema esperado — não valide sem checar
                      manualmente.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Artefatos</h2>
        <div className="space-y-10">
          {ARTIFACT_TIPOS.map((tipo) => {
            const versions = artifactsByTipo.get(tipo) ?? [];
            return (
              <div key={tipo}>
                <p className="mb-4 text-sm font-semibold text-foreground">{ARTIFACT_LABELS[tipo]}</p>
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ainda não gerado.</p>
                ) : (
                  <div className="space-y-8">
                    {versions.map((item) => (
                      <div
                        key={item.id}
                        className="space-y-4 border-t border-border pt-6 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-foreground">versão {item.versao}</p>
                            <StatusPill tone={ARTIFACT_STATUS_TONE[item.status]}>
                              {ARTIFACT_STATUS_LABEL[item.status]}
                            </StatusPill>
                          </div>
                          {item.status === "rascunho_agente" && <ReviewActions artifactId={item.id} />}
                        </div>
                        {item.status === "rejeitado" && item.motivo_rejeicao && (
                          <p className="text-sm text-bad">Motivo da rejeição: {item.motivo_rejeicao}</p>
                        )}
                        <ArtifactDetail tipo={tipo} conteudo={item.conteudo} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Anexos</h2>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm text-foreground">{attachment.nome_arquivo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(attachment.tamanho_bytes)} · {formatDate(attachment.criado_em)}
                  </p>
                </div>
                {attachment.signedUrl && (
                  <a
                    href={attachment.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
                  >
                    Abrir
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
