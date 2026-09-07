import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { ensureJourneyState, etapaAgent } from "@/lib/agents/journey";
import { ALLOWED_MIME_TYPES, ALLOWED_MIME_LABEL, MAX_FILE_SIZE_BYTES, ATTACHMENTS_BUCKET } from "@/lib/attachments/limits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return new Response("Arquivo é obrigatório.", { status: 400 });
  }
  if (!(file.type in ALLOWED_MIME_TYPES)) {
    return new Response(`Formato não aceito. Envie um destes: ${ALLOWED_MIME_LABEL}.`, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return new Response("Arquivo maior que 15 MB.", { status: 400 });
  }

  const mentee = await ensureMentee(supabase, user);
  const admin = createAdminClient();
  const journey = await ensureJourneyState(admin, mentee.id);
  const conversationId = await resolveCurrentConversation(supabase, mentee.id, journey.etapa_atual);

  const bytes = Buffer.from(await file.arrayBuffer());
  const storagePath = `${mentee.id}/${conversationId}/${randomUUID()}-${file.name}`;

  // Bucket privado (criado com service_role, nunca URL pública — SPEC-SOFTWARE.md
  // §12). Upload roda como admin porque não há policy de Storage pro
  // mentorado; a linha em `attachments` logo abaixo, essa sim, roda com o
  // client do próprio mentorado e respeita `attachments_insert_own`.
  const { error: uploadError } = await admin.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return new Response("Falha ao enviar o arquivo.", { status: 500 });
  }

  const { data: attachment, error: insertError } = await supabase
    .from("attachments")
    .insert({
      mentee_id: mentee.id,
      conversation_id: conversationId,
      nome_arquivo: file.name,
      tipo_mime: file.type,
      tamanho_bytes: file.size,
      storage_path: storagePath,
    })
    .select("id, nome_arquivo, tipo_mime, tamanho_bytes")
    .single();

  if (insertError) {
    await admin.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    return new Response("Falha ao registrar o anexo.", { status: 500 });
  }

  return Response.json({ attachment });
}

// O anexo precisa de conversation_id no insert (not null), mas nesse ponto
// ainda não sabemos a qual território a próxima mensagem vai rotear — o
// roteador só decide isso a partir do texto, que ainda não existe. Reusa a
// conversa mais recente do mentorado (qualquer território, mesma lógica de
// "continuidade vale") ou abre uma nova no copiloto da etapa atual. Se
// /api/chat acabar roteando pra um território diferente, ele mesmo corrige
// attachments.conversation_id ao vincular message_id.
async function resolveCurrentConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menteeId: string,
  etapaAtual: string
) {
  const { data: recent } = await supabase
    .from("conversations")
    .select("id")
    .eq("mentee_id", menteeId)
    .order("ultima_atividade", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) return recent.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ mentee_id: menteeId, agent_key: etapaAgent(etapaAtual), etapa: etapaAtual })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}
