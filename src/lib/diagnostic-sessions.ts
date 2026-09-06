import type { SupabaseClient } from "@supabase/supabase-js";

export type DiagnosticSession = {
  id: string;
  status: "em_andamento" | "concluida";
  current_block: number;
};

// O diagnóstico é uma sessão única por mentorado nesta fase: se já existe
// uma (em andamento ou concluída), retoma; só cria a primeira.
export async function getOrCreateDiagnosticSession(
  supabase: SupabaseClient,
  menteeId: string
): Promise<DiagnosticSession> {
  const { data: latest } = await supabase
    .from("diagnostic_sessions")
    .select("id, status, current_block")
    .eq("mentee_id", menteeId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) return latest;

  const { data: created, error } = await supabase
    .from("diagnostic_sessions")
    .insert({ mentee_id: menteeId })
    .select("id, status, current_block")
    .single();

  if (error) throw error;
  return created;
}
