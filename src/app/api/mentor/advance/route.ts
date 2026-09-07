import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ensureMentee } from "@/lib/mentees";
import { ensureJourneyState, ETAPA_ORDER, ETAPA_MES } from "@/lib/agents/journey";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isMentor(user.email)) {
    return new Response("Não autorizado.", { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const menteeId = body?.menteeId;

  if (typeof menteeId !== "string" || menteeId.length === 0) {
    return new Response("menteeId é obrigatório.", { status: 400 });
  }

  const admin = createAdminClient();
  const journey = await ensureJourneyState(admin, menteeId);

  const currentIndex = ETAPA_ORDER.indexOf(journey.etapa_atual as (typeof ETAPA_ORDER)[number]);
  if (currentIndex === -1 || currentIndex === ETAPA_ORDER.length - 1) {
    return new Response("Mentorado já está na última etapa (MOVE).", { status: 400 });
  }

  const nextEtapa = ETAPA_ORDER[currentIndex + 1];

  // atualizado_por referencia mentees(id), mesmo caso de artifacts.validado_por
  // — resolve a própria linha de mentee do mentor antes de gravar.
  const mentorMentee = await ensureMentee(supabase, user);

  const { data: updated, error } = await admin
    .from("journey_state")
    .update({
      etapa_atual: nextEtapa,
      mes: ETAPA_MES[nextEtapa],
      etapas_liberadas: [...journey.etapas_liberadas, nextEtapa],
      atualizado_em: new Date().toISOString(),
      atualizado_por: mentorMentee.id,
    })
    .eq("id", journey.id)
    .select("etapa_atual, mes, etapas_liberadas")
    .single();

  if (error) {
    return new Response("Falha ao avançar etapa.", { status: 500 });
  }

  return Response.json({ ok: true, journey: updated });
}
