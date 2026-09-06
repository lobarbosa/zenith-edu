import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";

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

  if (typeof profileId !== "string" || profileId.length === 0) {
    return new Response("profileId é obrigatório.", { status: 400 });
  }

  const admin = createAdminClient();

  // O filtro por status evita revalidar (e resetar validated_at/by) um
  // perfil que já foi validado por engano de um duplo clique.
  const { data, error } = await admin
    .from("executive_profiles")
    .update({
      status: "validado",
      validated_at: new Date().toISOString(),
      validated_by: user.id,
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
