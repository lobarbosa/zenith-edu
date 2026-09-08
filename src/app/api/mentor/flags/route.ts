import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";

// Marca um sinal (mentor_flags) como lido — some da lista de "Sinais" em
// /mentor. Não é validação de nada, só reconhecimento pelo mentor.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isMentor(user.email)) {
    return new Response("Não autorizado.", { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const flagId = typeof body?.flagId === "string" ? body.flagId : "";

  if (!flagId) {
    return new Response("flagId é obrigatório.", { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mentor_flags")
    .update({ lido: true })
    .eq("id", flagId)
    .select("id")
    .maybeSingle();

  if (error) {
    return new Response("Falha ao marcar o sinal como lido.", { status: 500 });
  }
  if (!data) {
    return new Response("Sinal não encontrado.", { status: 404 });
  }
  return Response.json({ ok: true });
}
