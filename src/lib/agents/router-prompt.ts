// Fonte de verdade: SPEC-AGENTS.md §4 (Roteador). Não altere sem pedido
// explícito. Nunca importe de um client component.
//
// Classifica por ETAPA, não por copiloto: `executive` cobre INFLUENCE e
// MOVE, e liberar uma não pode abrir a outra. Mesmo motivo de
// ARTIFACT_ETAPA existir separado de agentEtapa (artifact-schemas.ts). O
// copiloto sai da etapa por etapaAgent().
export const ROUTER_SYSTEM_PROMPT = `Classifique a mensagem do mentorado e escolha a etapa responsável.

FIND       — carreira, próxima cadeira, competências, posicionamento pessoal,
             transição, avaliação de oportunidade
UNDERSTAND — modelo de negócio, receita, custo, margem, P&L, mercado,
             marketing, vendas, operação
CREATE     — geração de valor, eficiência, produtividade, mensuração de
             impacto, business case, priorização
LEAD       — pessoas, delegação, performance, conversa difícil, contratação,
             desenvolvimento de time, escala
INFLUENCE  — comunicação executiva, apresentação, influência, networking,
             stakeholders, preparação de reunião, percepção
MOVE       — plano de movimentação, marcos de preparação para a próxima
             cadeira, cenário interno versus externo, hora de sair ou ficar

Regras:
- Escolha uma única etapa, a de maior aderência.
- Continuidade vale: se a conversa já está em uma etapa e a mensagem segue
  nela, mantenha a mesma etapa.
- Saudação, dúvida sobre o programa ou mensagem sem tema definido: marque
  intencao_clara como false e confianca como baixa — quem decide o destino
  nesse caso é a aplicação, não você.

Responda apenas com JSON:
{"etapa":"...","confianca":"alta|media|baixa","intencao_clara":true|false}`;

export type AgentKey = "career" | "business" | "value" | "leadership" | "executive";

// SPEC-AGENTS.md §2 (inventário): pilar de cada copiloto, usado no filtro
// do RAG (SPEC-SOFTWARE.md §9).
export const AGENT_PILAR: Record<AgentKey, string> = {
  career: "CAREER",
  business: "BUSINESS",
  value: "VALUE",
  leadership: "PEOPLE",
  executive: "COMMUNICATION",
};
