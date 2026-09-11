import type { ArtifactTipo } from "./artifact-schemas";

// Fonte: SPEC-AGENTS.md §11 ("Geração de artefato"). A spec não dá um
// prompt narrativo pronto pra este passo (diferente dos prompts de
// agente) — mesma situação de profile-prompt.ts: regras semânticas
// verbatim + texto de conexão mínimo. Nunca importe de um client
// component.
const GENERATION_RULES = `Você organiza o material de uma conversa entre um mentorado e um copiloto do T-Shaped Executive em um artefato estruturado.

REGRAS
- Todo campo deve rastrear a uma fala do mentorado na conversa abaixo, ou a
  um artefato anterior já validado incluído no contexto. Nunca infira,
  nunca invente.
- Campo de texto ou lista sem base concreta na conversa fica vazio (string
  vazia ou lista vazia) — nunca preenchido por invenção. Campo de opção
  fixa (nível, situação, distância) sem base concreta fica null — nunca
  invente uma opção, e nunca escreva algo fora das opções dadas. Um
  artefato incompleto é melhor que um artefato plausível e errado, porque
  o mentorado trata como diagnóstico.
- Responda apenas com o JSON do schema pedido, sem texto ao redor.`;

const ARTIFACT_FOCUS: Record<ArtifactTipo, string> = {
  career_map:
    "Organize a trajetória (período, papel, escopo, virada de cada posição), os padrões que se repetem, as forças recorrentes e os tetos que o mentorado encontrou na carreira.",
  competency_map:
    "Organize as competências discutidas: pilar, nível atual, nível que a próxima cadeira exige, evidência do nível atual e a lacuna. Feche com as prioridades de desenvolvimento.",
  next_chair_map:
    "Organize a cadeira-alvo (papel, escopo, tipo de problema, horizonte), por que essa cadeira, cada requisito e sua situação (atendido/parcial/não atendido) com evidência, a distância até lá, hipóteses alternativas e riscos da escolha.",
  business_map:
    "Organize a empresa (setor, modelo de receita, porte), o motor econômico (de onde vem a receita, onde está a margem, o que pressiona), a estrutura de decisão (quem decide sobre o quê e com base em que), como a área do mentorado se conecta a isso (como contribui, como é medida, visibilidade), as lacunas de informação que ele identificou e as perguntas que ele precisa levar pra dentro da empresa.",
  value_creation_map:
    "Organize cada iniciativa discutida (nome, tipo — receita, custo ou risco —, linha de base, métrica, impacto estimado, premissas, horizonte, quem se importa com esse número, confiança e status), a ordem de prioridade entre elas, a narrativa de impacto que amarra o conjunto e o que ainda falta medir.",
  leadership_map:
    "Organize o time (tamanho, senioridade, maturidade), a delegação (o que ele delega, o que retém e por quê, e o nível — tarefa, projeto ou resultado), os gargalos que ele mesmo representa, as conversas difíceis pendentes (com quem, tema, risco de adiar), os movimentos de desenvolvimento de cada pessoa do time (pessoa, lacuna, movimento) e as prioridades.",
  executive_positioning_map:
    "Organize a percepção atual e a desejada, cada stakeholder discutido (quem, poder, percepção atual, percepção desejada, evidência que falta, movimento), a narrativa (contexto, decisão, número), os espaços de decisão (fórum, se ele ocupa hoje, como entrar) e os riscos de percepção.",
  executive_movement_plan:
    "Organize a cadeira-alvo, a situação hoje, cada marco (prazo, marco, evidência de conclusão, responsável — mentorado, mentor ou terceiro), as competências em desenvolvimento, as provas de valor já acumuladas, os movimentos de percepção, os cenários (interno ou externo, condições, preparação), os riscos e a revisão.",
};

export function artifactSystemPrompt(tipo: ArtifactTipo): string {
  return `${GENERATION_RULES}\n\n${ARTIFACT_FOCUS[tipo]}`;
}
