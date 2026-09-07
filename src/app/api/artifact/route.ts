import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { ARTIFACT_TIPOS, ARTIFACT_AGENT, type ArtifactTipo } from "@/lib/agents/artifact-schemas";
import { generateArtifact } from "@/lib/agents/artifact-generation";
import { ensureJourneyState, isEtapaLiberada } from "@/lib/agents/journey";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tipo = body?.tipo as ArtifactTipo | undefined;

  if (!tipo || !ARTIFACT_TIPOS.includes(tipo)) {
    return new Response(`tipo deve ser um de: ${ARTIFACT_TIPOS.join(", ")}.`, { status: 400 });
  }

  const mentee = await ensureMentee(supabase, user);
  const admin = createAdminClient();

  const journey = await ensureJourneyState(admin, mentee.id);
  if (!isEtapaLiberada(journey.etapas_liberadas, ARTIFACT_AGENT[tipo])) {
    return new Response("Esta etapa ainda não foi liberada pelo mentor.", { status: 403 });
  }

  // Evita empilhar rascunho em cima de rascunho enquanto o mentor ainda não
  // se pronunciou sobre o anterior — pedir de novo é ação depois de validar
  // ou explicitamente descartado, não enquanto já existe um pendente.
  const { data: pending } = await supabase
    .from("artifacts")
    .select("id")
    .eq("mentee_id", mentee.id)
    .eq("tipo", tipo)
    .eq("status", "rascunho_agente")
    .maybeSingle();

  if (pending) {
    return new Response("Já existe uma versão em revisão do mentor para este artefato.", {
      status: 409,
    });
  }

  const result = await generateArtifact(supabase, admin, mentee.id, tipo);

  if (!result.ok) {
    const status = result.reason === "sem_conversa" ? 400 : 502;
    const message =
      result.reason === "sem_conversa"
        ? "Converse com o copiloto antes de gerar este artefato."
        : "Falha ao gerar o artefato. Tente de novo.";
    return new Response(message, { status });
  }

  return Response.json({ ok: true, artifact: result.artifact });
}
