import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embeddings";

// SPEC-SOFTWARE.md §9: top 5 trechos, filtrado por pilar do agente e
// etapas liberadas, injetados como contexto — nunca citados literalmente
// ao usuário (isso é regra do prompt, não desta função).

// Piso de relevância. O RPC `match_knowledge_chunks` calcula a similaridade
// e ordena por ela, mas não filtra: pedir 5 numa poça de 1 a 4 documentos
// — que é o tamanho real do pool por (pilar, etapa) hoje — devolvia o pilar
// inteiro em toda mensagem, relevante ou não. E o bloco de contexto rotula
// aquilo como "MATERIAL DE APOIO RELEVANTE", com o prompt mandando usar.
//
// Este número é PROVISÓRIO e precisa ser calibrado com dado real: cada
// busca registra no log os scores que vieram e o que foi cortado. Suba o
// piso se trecho fraco continuar passando; baixe se o log mostrar busca
// voltando vazia com frequência.
const SIMILARIDADE_MINIMA = 0.35;

type Match = { conteudo: string; similarity: number };

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

    const matches = (data ?? []) as Match[];
    const aproveitados = matches.filter((m) => m.similarity >= SIMILARIDADE_MINIMA);

    // A única medida de qualidade de recuperação que o sistema tem. Sem
    // isso o score é calculado pelo Postgres e descartado aqui, e não há
    // como saber se o RAG está recuperando ou só devolvendo o pilar.
    console.info(
      JSON.stringify({
        evento: "rag",
        pilar,
        etapas: etapasLiberadas,
        retornados: matches.length,
        aproveitados: aproveitados.length,
        scores: matches.map((m) => Number(m.similarity.toFixed(3))),
        piso: SIMILARIDADE_MINIMA,
      })
    );

    return aproveitados.map((m) => m.conteudo);
  } catch (error) {
    console.error("searchKnowledge falhou", error);
    return [];
  }
}
