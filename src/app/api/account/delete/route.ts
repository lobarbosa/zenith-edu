import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const admin = createAdminClient();

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
