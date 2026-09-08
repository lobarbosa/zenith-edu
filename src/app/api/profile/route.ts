import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { synthesizeExecutiveProfile } from "@/lib/agents/executive-profile";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return new Response("sessionId é obrigatório.", { status: 400 });
  }

  // RLS garante que só retorna a sessão se pertencer ao usuário autenticado.
  const { data: session } = await supabase
    .from("diagnostic_sessions")
    .select("id, status, mentee_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return new Response("Sessão não encontrada.", { status: 404 });
  }

  if (session.status !== "concluida") {
    return new Response("O diagnóstico ainda não foi concluído.", { status: 400 });
  }

  const admin = createAdminClient();
  const profile = await synthesizeExecutiveProfile(supabase, admin, session);

  if (!profile) {
    return new Response("Falha ao sintetizar o perfil.", { status: 502 });
  }

  return Response.json({ id: profile.id, version: profile.version, status: profile.status });
}
