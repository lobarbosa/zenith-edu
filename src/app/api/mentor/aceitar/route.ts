import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ensureMentee } from "@/lib/mentees";
import { ensureJourneyState } from "@/lib/agents/journey";

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

  const { data: mentee } = await admin
    .from("mentees")
    .select("id, papel")
    .eq("id", menteeId)
    .maybeSingle();

  if (!mentee) {
    return new Response("Mentorado não encontrado.", { status: 404 });
  }

  if (mentee.papel !== "prospect") {
    return new Response("Esta pessoa já está no programa.", { status: 400 });
  }

  // O aceite é consequência da validação, não um caminho paralelo: sem
  // perfil validado não há o que aceitar (SPEC-SOFTWARE.md §42).
  const { data: validado } = await admin
    .from("executive_profiles")
    .select("id")
    .eq("mentee_id", menteeId)
    .eq("status", "validado")
    .limit(1)
    .maybeSingle();

  if (!validado) {
    return new Response("Valide o Perfil Executivo antes de aceitar no programa.", { status: 400 });
  }

  const mentorMentee = await ensureMentee(supabase, user);

  const { data: cohort } = await admin
    .from("cohorts")
    .select("id")
    .eq("status", "ativa")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error } = await admin
    .from("mentees")
    .update({
      papel: "mentorado",
      aceito_em: new Date().toISOString(),
      aceito_por: mentorMentee.id,
      cohort_id: cohort?.id ?? null,
    })
    .eq("id", menteeId);

  if (error) {
    console.error("Falha ao aceitar mentorado:", error);
    return new Response("Falha ao aceitar no programa.", { status: 500 });
  }

  // Libera FIND criando o estado da jornada — é o que destrava /jornada,
  // /mapas e o copiloto.
  await ensureJourneyState(admin, menteeId);

  return Response.json({ ok: true });
}
