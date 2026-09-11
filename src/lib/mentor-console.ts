import type { SupabaseClient } from "@supabase/supabase-js";
import { menteeDisplayName, type MenteeIdentity } from "@/lib/mentees";

// SPEC-SOFTWARE.md §11: painel em /mentor, "prioridade é atenção, não
// métrica". §13: alertas mínimos. Tudo aqui lê tabelas que já existem desde
// a Fase 1 (0004_fase1_schema.sql) e já são gravadas por signals.ts,
// /api/chat, /api/diagnostic e artifact-generation.ts — Fase 4 é só expor.

export type MenteeLite = MenteeIdentity & { id: string };

function extractNome(mentees: MenteeIdentity[] | MenteeIdentity | null): string {
  const row = Array.isArray(mentees) ? mentees[0] : mentees;
  return row ? menteeDisplayName(row) : "—";
}

// Sinais ---------------------------------------------------------------

export type Sinal = {
  id: string;
  menteeId: string;
  menteeNome: string;
  tipo: "contradicao" | "resistencia" | "risco" | "avanco" | "fora_de_escopo";
  severidade: "baixa" | "media" | "alta";
  descricao: string;
  criadoEm: string;
};

const SEVERIDADE_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

// mentor_flags nunca tem policy de select pra mentorado (SPEC-AGENTS.md
// §13) — sempre via admin/service_role, mesma trava de /mentor hoje.
export async function getSinaisNaoLidos(admin: SupabaseClient): Promise<Sinal[]> {
  const { data } = await admin
    .from("mentor_flags")
    .select("id, mentee_id, tipo, severidade, descricao, criado_em, mentees(email, nome, sobrenome)")
    .eq("lido", false)
    .order("criado_em", { ascending: true });

  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      menteeId: row.mentee_id as string,
      menteeNome: extractNome(row.mentees as never),
      tipo: row.tipo as Sinal["tipo"],
      severidade: row.severidade as Sinal["severidade"],
      descricao: row.descricao as string,
      criadoEm: row.criado_em as string,
    }))
    // ordem por criado_em já vem da query — sort estável só reordena por
    // severidade, preservando a ordem cronológica dentro de cada uma.
    .sort((a, b) => SEVERIDADE_ORDER[a.severidade] - SEVERIDADE_ORDER[b.severidade]);
}

// Pulso da turma ---------------------------------------------------------

export type PulsoMentee = {
  menteeId: string;
  menteeNome: string;
  etapaAtual: string | null;
  diasSemAtividade: number | null;
  artefatosConcluidos: number;
};

// "Última atividade" combina conversations.ultima_atividade (mantido a
// cada turno de copiloto) com started_at/completed_at do diagnóstico —
// não há timestamp por turno em diagnostic_sessions, então um diagnóstico
// longo e ainda em andamento pode aparecer levemente desatualizado aqui.
// Aceitável: o diagnóstico é desenhado pra rodar numa sentada só.
export async function getPulsoDaTurma(
  admin: SupabaseClient,
  mentees: MenteeLite[]
): Promise<PulsoMentee[]> {
  if (mentees.length === 0) return [];
  const menteeIds = mentees.map((m) => m.id);

  const [{ data: journeys }, { data: conversations }, { data: sessions }, { data: artifacts }] =
    await Promise.all([
      admin.from("journey_state").select("mentee_id, etapa_atual").in("mentee_id", menteeIds),
      admin.from("conversations").select("mentee_id, ultima_atividade").in("mentee_id", menteeIds),
      admin
        .from("diagnostic_sessions")
        .select("mentee_id, started_at, completed_at")
        .in("mentee_id", menteeIds),
      admin
        .from("artifacts")
        .select("mentee_id")
        .eq("status", "validado_mentor")
        .in("mentee_id", menteeIds),
    ]);

  const etapaByMentee = new Map((journeys ?? []).map((j) => [j.mentee_id, j.etapa_atual as string]));

  const lastActivityByMentee = new Map<string, number>();
  function bump(menteeId: string, iso: string | null) {
    if (!iso) return;
    const t = new Date(iso).getTime();
    const current = lastActivityByMentee.get(menteeId);
    if (!current || t > current) lastActivityByMentee.set(menteeId, t);
  }
  for (const c of conversations ?? []) bump(c.mentee_id, c.ultima_atividade);
  for (const s of sessions ?? []) {
    bump(s.mentee_id, s.completed_at);
    bump(s.mentee_id, s.started_at);
  }

  const artifactCountByMentee = new Map<string, number>();
  for (const a of artifacts ?? []) {
    artifactCountByMentee.set(a.mentee_id, (artifactCountByMentee.get(a.mentee_id) ?? 0) + 1);
  }

  const now = Date.now();
  return mentees.map((m) => {
    const last = lastActivityByMentee.get(m.id);
    return {
      menteeId: m.id,
      menteeNome: menteeDisplayName(m),
      etapaAtual: etapaByMentee.get(m.id) ?? null,
      diasSemAtividade: last ? Math.floor((now - last) / 86_400_000) : null,
      artefatosConcluidos: artifactCountByMentee.get(m.id) ?? 0,
    };
  });
}

// Custo -------------------------------------------------------------------

export type CustoMentee = { menteeId: string; menteeNome: string; custoUsd: number };

// Soma agent_runs (copiloto, artefato, perfil, roteador, sinais) +
// diagnostic_sessions (diagnóstico) — "custo por mentorado" no
// SPEC-SOFTWARE.md §11 não separa por origem, é o consumo total.
export async function getCustoPorMentee(
  admin: SupabaseClient,
  mentees: MenteeLite[]
): Promise<CustoMentee[]> {
  if (mentees.length === 0) return [];
  const menteeIds = mentees.map((m) => m.id);

  const [{ data: runs }, { data: sessions }] = await Promise.all([
    admin.from("agent_runs").select("mentee_id, custo_usd").in("mentee_id", menteeIds),
    admin.from("diagnostic_sessions").select("mentee_id, custo_usd").in("mentee_id", menteeIds),
  ]);

  const totals = new Map<string, number>();
  function add(menteeId: string | null, valor: number | string | null) {
    if (!menteeId || valor == null) return;
    totals.set(menteeId, (totals.get(menteeId) ?? 0) + Number(valor));
  }
  for (const r of runs ?? []) add(r.mentee_id, r.custo_usd);
  for (const s of sessions ?? []) add(s.mentee_id, s.custo_usd);

  return mentees
    .map((m) => ({ menteeId: m.id, menteeNome: menteeDisplayName(m), custoUsd: totals.get(m.id) ?? 0 }))
    .sort((a, b) => b.custoUsd - a.custoUsd);
}

// Alertas -------------------------------------------------------------------

export type Alerta = { tipo: "falha_schema" | "custo_teto" | "latencia"; descricao: string };

// SPEC-SOFTWARE.md §13 pede "custo por mentorado acima do teto definido"
// sem valor numérico — placeholder até virar decisão de produto explícita.
const CUSTO_TETO_USD = 5;
const LATENCIA_ALERTA_MS = 3000;
const FALHA_SCHEMA_LIMIAR = 0.1;
// Evita alerta ruidoso de "100% de falha" com 1 ou 2 gerações no início da turma.
const AMOSTRA_MINIMA_FALHA = 5;

export async function getAlertas(
  admin: SupabaseClient,
  custosPorMentee: CustoMentee[]
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  const [{ data: artifactRuns }, { data: perfilRuns }] = await Promise.all([
    admin.from("agent_runs").select("sucesso").like("agent_key", "artifact:%"),
    admin.from("agent_runs").select("sucesso").eq("agent_key", "perfil"),
  ]);
  const geracoes = [...(artifactRuns ?? []), ...(perfilRuns ?? [])];
  const falhas = geracoes.filter((g) => g.sucesso === false).length;
  if (geracoes.length >= AMOSTRA_MINIMA_FALHA && falhas / geracoes.length > FALHA_SCHEMA_LIMIAR) {
    const pct = Math.round((falhas / geracoes.length) * 100);
    alertas.push({
      tipo: "falha_schema",
      descricao: `${falhas} de ${geracoes.length} gerações falharam no schema (${pct}%) — acima do limiar de 10%.`,
    });
  }

  for (const c of custosPorMentee) {
    if (c.custoUsd > CUSTO_TETO_USD) {
      alertas.push({
        tipo: "custo_teto",
        descricao: `${c.menteeNome} passou do teto de US$ ${CUSTO_TETO_USD.toFixed(2)} — US$ ${c.custoUsd.toFixed(2)} até agora.`,
      });
    }
  }

  const { data: lentos } = await admin
    .from("agent_runs")
    .select("mentee_id, mentees(email, nome, sobrenome)")
    .gt("latencia_ms", LATENCIA_ALERTA_MS)
    .order("criado_em", { ascending: false })
    .limit(20);
  const menteesComLatencia = new Set(
    (lentos ?? []).map((r) => extractNome(r.mentees as never))
  );
  if (menteesComLatencia.size > 0) {
    alertas.push({
      tipo: "latencia",
      descricao: `Respostas acima de 3s recentemente: ${Array.from(menteesComLatencia).join(", ")}.`,
    });
  }

  return alertas;
}

// Preparação de encontro ---------------------------------------------------

export type PreparacaoEncontro = {
  ultimaNotaEm: string | null;
  novosArtefatos: number;
  etapaAtual: string | null;
};

// "Desde o último encontro" não tem tabela própria — usa a mentor_note mais
// recente como marco (cada encontro gera uma nota, por convenção de uso).
// Sem nota nenhuma ainda, o resumo cobre desde o início.
export async function getPreparacaoEncontro(
  admin: SupabaseClient,
  menteeId: string
): Promise<PreparacaoEncontro> {
  const [{ data: ultimaNota }, { data: journey }] = await Promise.all([
    admin
      .from("mentor_notes")
      .select("criado_em")
      .eq("mentee_id", menteeId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("journey_state").select("etapa_atual").eq("mentee_id", menteeId).maybeSingle(),
  ]);

  const desde = ultimaNota?.criado_em ?? null;

  let artifactsQuery = admin
    .from("artifacts")
    .select("id", { count: "exact", head: true })
    .eq("mentee_id", menteeId);
  if (desde) {
    artifactsQuery = artifactsQuery.gt("criado_em", desde);
  }
  const { count: novosArtefatos } = await artifactsQuery;

  return {
    ultimaNotaEm: desde,
    novosArtefatos: novosArtefatos ?? 0,
    etapaAtual: journey?.etapa_atual ?? null,
  };
}
