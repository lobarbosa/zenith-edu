import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENTS_BUCKET } from "@/lib/attachments/limits";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const admin = createAdminClient();

  // O cascade do banco (mentees.user_id -> auth.users on delete cascade)
  // apaga as LINHAS de attachments junto com tudo o mais, mas não os
  // arquivos de verdade no Storage — isso é outro sistema, sem cascade
  // entre os dois. Precisa apagar os objetos primeiro, com o storage_path
  // ainda disponível, antes de derrubar a conta (SPEC-SOFTWARE.md §12,
  // "remove também os arquivos em attachments/Storage").
  const { data: mentee } = await admin.from("mentees").select("id").eq("user_id", user.id).maybeSingle();

  if (mentee) {
    const { data: attachments } = await admin
      .from("attachments")
      .select("storage_path")
      .eq("mentee_id", mentee.id);

    if (attachments && attachments.length > 0) {
      const { error: removeError } = await admin.storage
        .from(ATTACHMENTS_BUCKET)
        .remove(attachments.map((a) => a.storage_path));

      if (removeError) {
        return new Response("Falha ao excluir os arquivos anexados. Tente de novo.", { status: 500 });
      }
    }
  }

  // mentees.user_id referencia auth.users com "on delete cascade" — apagar a
  // conta de auth já cascateia mentees, diagnostic_sessions, messages,
  // executive_profiles, journey_state, conversations, attachments, artifacts,
  // mentor_flags e mentor_notes (SPEC-SOFTWARE.md §12, "exclusão completa").
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return new Response("Falha ao excluir a conta. Tente de novo.", { status: 500 });
  }

  return Response.json({ ok: true });
}
