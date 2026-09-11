import { createClient } from "@/lib/supabase/server";
import { requireProgram } from "@/lib/mentee-access";
import { CopilotoChat } from "./copiloto-chat";

const HISTORY_LIMIT = 40;

export default async function CopilotoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await requireProgram(supabase, user!);

  // Mesmo filtro do histórico em /api/chat: RLS de messages combina (OR) o
  // caminho session_id (diagnóstico) com o de conversation_id (copiloto).
  const { data: rows } = await supabase
    .from("messages")
    .select("role, content, agent_key")
    .not("conversation_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const initialMessages = (rows ?? [])
    .slice()
    .reverse()
    .map((m: { role: string; content: string; agent_key: string | null }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      agentKey: m.agent_key ?? undefined,
    }));

  return <CopilotoChat initialMessages={initialMessages} />;
}
