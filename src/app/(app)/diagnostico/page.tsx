import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { getOrCreateDiagnosticSession } from "@/lib/diagnostic-sessions";
import { DiagnosticChat } from "./diagnostic-chat";
import { DiagnosticComplete } from "./diagnostic-complete";
import { DiagnosticOnboarding } from "./onboarding";
import { toIdentityValues } from "@/components/mentee-identity-form";

export default async function DiagnosticoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await ensureMentee(supabase, user!);

  // A linha de identificação é lida com admin porque o formulário grava com
  // admin (não há policy de UPDATE em mentees, de propósito — ver
  // /api/mentee/perfil). Ler pelo mesmo caminho evita divergência de RLS.
  const admin = createAdminClient();
  const { data: identidade } = await admin
    .from("mentees")
    .select("nome, sobrenome, data_nascimento, cargo, empresa, linkedin, telefone, carreira_inicio_ano")
    .eq("id", mentee.id)
    .single();

  // A sessão concluída manda mais que o formulário: quem entrou antes dele
  // existir e já terminou os oito blocos não é devolvido pro começo — o
  // lugar de completar a identificação, nesse caso, é /conta.
  const sessionEmCurso = await getOrCreateDiagnosticSession(supabase, mentee.id);

  if (sessionEmCurso.status === "concluida") {
    return <DiagnosticComplete />;
  }

  if (!identidade?.nome) {
    return <DiagnosticOnboarding initial={toIdentityValues(identidade)} />;
  }

  const session = sessionEmCurso;

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  return <DiagnosticChat sessionId={session.id} initialMessages={messages ?? []} />;
}
