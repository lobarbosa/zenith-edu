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

  if (typeof profileId === "string" && profileId.length > 0) {
    return validateProfile(user.id, profileId);
  }
  if (typeof artifactId === "string" && artifactId.length > 0) {
    // artifacts.validado_por referencia mentees(id), não auth.users(id)
    // (SPEC-SOFTWARE.md §6) — diferente de executive_profiles.validated_by.
    // Mentor também tem linha própria em mentees (ensureMentee roda pro
    // login dele também — ver docs/HUMAN-CHECKLIST.md §2).
    const mentorMentee = await ensureMentee(supabase, user);
    return validateArtifact(mentorMentee.id, artifactId);
  }

  return new Response("profileId ou artifactId é obrigatório.", { status: 400 });
}

// O filtro por status evita revalidar (e resetar validated_at/by ou
// validado_em/por) um item que já foi validado por engano de um duplo clique.
async function validateProfile(userId: string, profileId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("executive_profiles")
    .update({
      status: "validado",
      validated_at: new Date().toISOString(),
      validated_by: userId,
    })
    .eq("id", profileId)
    .eq("status", "rascunho_agente")
    .select("id")
    .maybeSingle();

  if (error) {
    return new Response("Falha ao validar.", { status: 500 });
  }
  if (!data) {
    return new Response("Perfil não encontrado ou já validado.", { status: 404 });
  }
  return Response.json({ ok: true });
}

async function validateArtifact(mentorMenteeId: string, artifactId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("artifacts")
    .update({
      status: "validado_mentor",
      validado_em: new Date().toISOString(),
      validado_por: mentorMenteeId,
    })
    .eq("id", artifactId)
    .eq("status", "rascunho_agente")
    .select("id")
    .maybeSingle();

  if (error) {
    return new Response("Falha ao validar.", { status: 500 });
  }
  if (!data) {
    return new Response("Artefato não encontrado ou já validado.", { status: 404 });
  }
  return Response.json({ ok: true });
}
