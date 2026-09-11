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
import { getPreparacaoEncontro } from "@/lib/mentor-console";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { EtapaStepper } from "../../jornada/etapa-stepper";
import { ProfileDetail } from "../profile-detail";
import { ReviewActions } from "../review-actions";
import { Transcript } from "../transcript";
import { AdvanceButton } from "./advance-button";
import { EncontroForm } from "./encontro-form";
import { NotesForm } from "./notes-form";

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

  const [preparacao, { data: notes }] = await Promise.all([
    getPreparacaoEncontro(admin, menteeId),
    admin
      .from("mentor_notes")
      .select("id, etapa, conteudo, visivel_ao_mentorado, criado_em")
      .eq("mentee_id", menteeId)
      .order("criado_em", { ascending: false }),
  ]);

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
    <main className="shell space-y-10 px-6 py-10">
      <div>
        <Link href="/mentor" className="text-xs text-muted-foreground hover:text-foreground">
          ← Meus mentorados
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jornada</CardTitle>
        </CardHeader>
        <CardContent>
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
          <div className="mt-6 border-t border-border pt-6">
            <EncontroForm menteeId={menteeId} proximoEncontro={journey.proximo_encontro} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preparação de encontro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground">
            {preparacao.ultimaNotaEm
              ? `Desde a última nota (${formatDate(preparacao.ultimaNotaEm)}): ${preparacao.novosArtefatos} artefato(s) novo(s), etapa atual ${preparacao.etapaAtual ?? "—"}.`
              : `Nenhuma nota registrada ainda: ${preparacao.novosArtefatos} artefato(s) desde o início, etapa atual ${preparacao.etapaAtual ?? "—"}.`}
          </p>

          <h3 className="mb-3 text-sm font-semibold text-foreground">Notas</h3>
          {!notes || notes.length === 0 ? (
            <p className="mb-6 text-sm text-muted-foreground">Nenhuma nota ainda.</p>
          ) : (
            <ul className="mb-6 space-y-4">
              {notes.map((note) => (
                <li key={note.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {note.etapa ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(note.criado_em)}</span>
                    {note.visivel_ao_mentorado && (
                      <StatusPill tone="good">Visível ao mentorado</StatusPill>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-foreground">{note.conteudo}</p>
                </li>
              ))}
            </ul>
          )}
          <NotesForm menteeId={menteeId} etapaAtual={journey.etapa_atual} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executive Diagnostic</CardTitle>
        </CardHeader>
        <CardContent>
          {!session ? (
            <p className="text-sm text-muted-foreground">Ainda não iniciou o diagnóstico.</p>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatTile label="Iniciado em" value={formatDate(session.started_at)} />
                <StatTile label="Concluído em" value={formatDate(session.completed_at)} />
                <StatTile
                  label="Tokens"
                  value={(session.input_tokens + session.output_tokens).toLocaleString("pt-BR")}
                />
                <StatTile label="Custo" value={`US$ ${Number(session.custo_usd).toFixed(4)}`} />
              </div>
              <Transcript messages={messages ?? []} />
            </>
          )}
        </CardContent>
      </Card>

      <Card id="perfil" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Perfil Executivo</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card id="artefatos" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Artefatos</CardTitle>
        </CardHeader>
        <CardContent>
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
                            {item.status === "rascunho_agente" && (
                              <ReviewActions artifactId={item.id} />
                            )}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </main>
  );
}
