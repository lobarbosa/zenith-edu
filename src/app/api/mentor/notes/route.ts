import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";

const ETAPAS = ["FIND", "UNDERSTAND", "CREATE", "LEAD", "INFLUENCE", "MOVE"];

// mentor_notes: SPEC-SOFTWARE.md §11 — nota do mentor após encontro,
// visivel_ao_mentorado controla se ela some pro mentorado em /jornada.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isMentor(user.email)) {
    return new Response("Não autorizado.", { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const menteeId = typeof body?.menteeId === "string" ? body.menteeId : "";
  const conteudo = typeof body?.conteudo === "string" ? body.conteudo.trim() : "";
  const etapa = typeof body?.etapa === "string" && ETAPAS.includes(body.etapa) ? body.etapa : null;
  const visivelAoMentorado = body?.visivelAoMentorado === true;

  if (!menteeId || conteudo.length === 0) {
    return new Response("menteeId e conteudo são obrigatórios.", { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("mentor_notes").insert({
    mentee_id: menteeId,
    etapa,
    conteudo,
    visivel_ao_mentorado: visivelAoMentorado,
  });

  if (error) {
    return new Response("Falha ao salvar a nota.", { status: 500 });
  }
  return Response.json({ ok: true });
}
