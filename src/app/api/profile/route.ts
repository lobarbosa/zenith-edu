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

  // Mesma guarda de /api/artifact. A síntese roda sozinha dentro de
  // /api/diagnostic quando o bloco 8 fecha (ver ARCHITECTURE.md), então esta
  // rota é o caminho de recuperação — e sem a guarda ela era um laço aberto:
  // cada chamada relê a transcrição inteira, roda Opus (o modelo mais caro do
  // sistema) e empilha mais uma versão na fila do mentor.
  const { data: pendente } = await supabase
    .from("executive_profiles")
    .select("id")
    .eq("mentee_id", session.mentee_id)
    .eq("status", "rascunho_agente")
    .maybeSingle();

  if (pendente) {
    return new Response("Já existe uma versão do perfil em revisão do mentor.", { status: 409 });
  }

  const admin = createAdminClient();
  const profile = await synthesizeExecutiveProfile(supabase, admin, session);

  if (!profile) {
    return new Response("Falha ao sintetizar o perfil.", { status: 502 });
  }

  return Response.json({ id: profile.id, version: profile.version, status: profile.status });
}
