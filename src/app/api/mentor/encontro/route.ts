import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
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
  const data = body?.data;

  if (typeof menteeId !== "string" || menteeId.length === 0) {
    return new Response("menteeId é obrigatório.", { status: 400 });
  }

  // String vazia limpa a data — desmarcar um encontro é uma ação legítima.
  const proximoEncontro = typeof data === "string" && data.length > 0 ? data : null;
  if (proximoEncontro && !/^\d{4}-\d{2}-\d{2}$/.test(proximoEncontro)) {
    return new Response("Data inválida.", { status: 400 });
  }

  const admin = createAdminClient();
  const journey = await ensureJourneyState(admin, menteeId);

  const { error } = await admin
    .from("journey_state")
    .update({ proximo_encontro: proximoEncontro })
    .eq("id", journey.id);

  if (error) {
    console.error("Falha ao gravar próximo encontro:", error);
    return new Response("Falha ao salvar a data.", { status: 500 });
  }

  return Response.json({ ok: true, proximoEncontro });
}
