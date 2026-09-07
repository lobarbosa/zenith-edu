import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embeddings";

// SPEC-SOFTWARE.md §9: top 5 trechos, filtrado por pilar do agente e
// etapas liberadas, injetados como contexto — nunca citados literalmente
// ao usuário (isso é regra do prompt, não desta função).
export async function searchKnowledge(
  admin: SupabaseClient,
  query: string,
  pilar: string,
  etapasLiberadas: string[]
): Promise<string[]> {
  // Corpus pode estar vazio (nenhum documento ingerido ainda) — devolve
  // sem trechos em vez de falhar; o copiloto funciona sem RAG, só mais
  // genérico até o conteúdo real existir (docs/HUMAN-CHECKLIST.md §0).
  try {
    const embedding = await embedQuery(query);
    const { data, error } = await admin.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      filter_pilar: pilar,
      filter_etapas: etapasLiberadas,
      match_count: 5,
    });

    if (error) {
      console.error("searchKnowledge: rpc falhou", error);
      return [];
    }

    return (data ?? []).map((row: { conteudo: string }) => row.conteudo);
  } catch (error) {
    console.error("searchKnowledge falhou", error);
    return [];
  }
}
