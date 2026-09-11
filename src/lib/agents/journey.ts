import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentKey } from "./router-prompt";

// SPEC-SOFTWARE.md §4 (jornada) e §6 (etapas_liberadas). "executive" cobre
// duas etapas (INFLUENCE e MOVE) — libera se qualquer uma das duas abriu.
export const ETAPA_MES: Record<string, number> = {
  FIND: 1,
  UNDERSTAND: 2,
  CREATE: 3,
  LEAD: 4,
  INFLUENCE: 5,
  MOVE: 6,
};

export const ETAPA_ORDER = ["FIND", "UNDERSTAND", "CREATE", "LEAD", "INFLUENCE", "MOVE"] as const;

export type Etapa = (typeof ETAPA_ORDER)[number];

export function isEtapa(value: string): value is Etapa {
  return (ETAPA_ORDER as readonly string[]).includes(value);
}

const AGENT_ETAPAS: Record<AgentKey, Etapa[]> = {
  career: ["FIND"],
  business: ["UNDERSTAND"],
  value: ["CREATE"],
  leadership: ["LEAD"],
  executive: ["INFLUENCE", "MOVE"],
};

// Qual copiloto é "dono" de uma etapa. A liberação é sempre decidida pela
// etapa, nunca pelo copiloto: `executive` cobre INFLUENCE e MOVE, e abrir
// o mês 5 não pode abrir o mês 6 junto.
export function etapaAgent(etapa: string): AgentKey {
  const entry = (Object.entries(AGENT_ETAPAS) as [AgentKey, Etapa[]][]).find(([, etapas]) =>
    (etapas as string[]).includes(etapa)
  );
  return entry ? entry[0] : "career";
}

export type JourneyState = {
  id: string;
  etapa_atual: string;
  mes: number;
  etapas_liberadas: string[];
};

// Nenhuma policy de insert pra mentorado (avanço de etapa é ação do mentor
// — ver 0004_fase1_schema.sql). O bootstrap do mês 1/FIND na primeira
// mensagem ao copiloto não é "avançar etapa", é só o estado inicial da
// jornada existir; por isso roda com admin (service_role), igual a
// qualquer outra escrita cross-policy já feita em /api/mentor/*.
export async function ensureJourneyState(
  admin: SupabaseClient,
  menteeId: string
): Promise<JourneyState> {
  const { data: existing } = await admin
    .from("journey_state")
    .select("id, etapa_atual, mes, etapas_liberadas")
    .eq("mentee_id", menteeId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await admin
    .from("journey_state")
    .insert({ mentee_id: menteeId })
    .select("id, etapa_atual, mes, etapas_liberadas")
    .single();

  if (error) throw error;
  return created;
}
