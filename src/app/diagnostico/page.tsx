import { createClient } from "@/lib/supabase/server";
import { ensureMentee } from "@/lib/mentees";
import { getOrCreateDiagnosticSession } from "@/lib/diagnostic-sessions";
import { DiagnosticChat } from "./diagnostic-chat";
import { DiagnosticComplete } from "./diagnostic-complete";

export default async function DiagnosticoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await ensureMentee(supabase, user!);
  const session = await getOrCreateDiagnosticSession(supabase, mentee.id);

  if (session.status === "concluida") {
    return <DiagnosticComplete />;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  return <DiagnosticChat sessionId={session.id} initialMessages={messages ?? []} />;
}
