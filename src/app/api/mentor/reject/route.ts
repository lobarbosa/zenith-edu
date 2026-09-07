import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ensureMentee } from "@/lib/mentees";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isMentor(user.email)) {
    return new Response("Não autorizado.", { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const profileId = body?.profileId;
  const artifactId = body?.artifactId;
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim() : "";

  if (motivo.length === 0) {
    return new Response("O motivo da rejeição é obrigatório.", { status: 400 });
  }

  if (typeof profileId === "string" && profileId.length > 0) {
    return rejectProfile(user.id, profileId, motivo);
  }
  if (typeof artifactId === "string" && artifactId.length > 0) {
    // Mesma lógica de /api/mentor/validate: artifacts.rejeitado_por
    // referencia mentees(id), não auth.users(id).
    const mentorMentee = await ensureMentee(supabase, user);
    return rejectArtifact(mentorMentee.id, artifactId, motivo);
  }

  return new Response("profileId ou artifactId é obrigatório.", { status: 400 });
}

// O filtro por status evita rejeitar (e sobrescrever motivo/data) um item
// que já foi revisado — mesma trava usada em validateProfile/validateArtifact.
async function rejectProfile(userId: string, profileId: string, motivo: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("executive_profiles")
    .update({
      status: "rejeitado",
      motivo_rejeicao: motivo,
      rejeitado_em: new Date().toISOString(),
      rejeitado_por: userId,
    })
    .eq("id", profileId)
    .eq("status", "rascunho_agente")
    .select("id")
    .maybeSingle();

  if (error) {
    return new Response("Falha ao rejeitar.", { status: 500 });
  }
  if (!data) {
    return new Response("Perfil não encontrado ou já revisado.", { status: 404 });
  }
  return Response.json({ ok: true });
}

async function rejectArtifact(mentorMenteeId: string, artifactId: string, motivo: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("artifacts")
    .update({
      status: "rejeitado",
      motivo_rejeicao: motivo,
      rejeitado_em: new Date().toISOString(),
      rejeitado_por: mentorMenteeId,
    })
    .eq("id", artifactId)
    .eq("status", "rascunho_agente")
    .select("id")
    .maybeSingle();

  if (error) {
    return new Response("Falha ao rejeitar.", { status: 500 });
  }
  if (!data) {
    return new Response("Artefato não encontrado ou já revisado.", { status: 404 });
  }
  return Response.json({ ok: true });
}
