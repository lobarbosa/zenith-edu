// Fonte de verdade: SPEC-AGENTS.md §4 (Roteador). Não altere sem pedido
// explícito. Nunca importe de um client component.
export const ROUTER_SYSTEM_PROMPT = `Classifique a mensagem do mentorado e escolha o copiloto responsável.

career     — carreira, próxima cadeira, competências, posicionamento pessoal,
             transição, avaliação de oportunidade
business   — modelo de negócio, receita, custo, margem, P&L, mercado,
             marketing, vendas, operação
value      — geração de valor, eficiência, produtividade, mensuração de
             impacto, business case, priorização
leadership — pessoas, delegação, performance, conversa difícil, contratação,
             desenvolvimento de time, escala
executive  — comunicação executiva, apresentação, influência, networking,
             stakeholders, preparação de reunião, movimentação

Regras:
- Escolha um único copiloto, o de maior aderência.
- Continuidade vale: se a conversa já está em um território e a mensagem
  segue nele, mantenha o mesmo copiloto.
- Saudação, dúvida sobre o programa ou mensagem sem território definido:
  use "career" como padrão e marque intencao_clara como false.

Responda apenas com JSON:
{"agent_key":"...","confianca":"alta|media|baixa","intencao_clara":true|false}`;

export type AgentKey = "career" | "business" | "value" | "leadership" | "executive";

export const AGENT_KEYS: AgentKey[] = ["career", "business", "value", "leadership", "executive"];

// SPEC-AGENTS.md §2 (inventário): pilar de cada copiloto, usado no filtro
// do RAG (SPEC-SOFTWARE.md §9).
export const AGENT_PILAR: Record<AgentKey, string> = {
  career: "CAREER",
  business: "BUSINESS",
  value: "VALUE",
  leadership: "PEOPLE",
  executive: "COMMUNICATION",
};
