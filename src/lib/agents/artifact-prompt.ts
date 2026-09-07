import type { ArtifactTipo } from "./artifact-schemas";

// Fonte: SPEC-AGENTS.md §11 ("Geração de artefato"). A spec não dá um
// prompt narrativo pronto pra este passo (diferente dos prompts de
// agente) — mesma situação de profile-prompt.ts: regras semânticas
// verbatim + texto de conexão mínimo. Nunca importe de um client
// component.
const GENERATION_RULES = `Você organiza o material de uma conversa entre um mentorado e o copiloto de carreira do T-Shaped Executive em um artefato estruturado.

REGRAS
- Todo campo deve rastrear a uma fala do mentorado na conversa abaixo, ou a
  um artefato anterior já validado incluído no contexto. Nunca infira,
  nunca invente.
- Campo sem base concreta na conversa fica vazio (string vazia ou lista
  vazia) — nunca preenchido por invenção. Um artefato incompleto é melhor
  que um artefato plausível e errado, porque o mentorado trata como
  diagnóstico.
- Responda apenas com o JSON do schema pedido, sem texto ao redor.`;

const ARTIFACT_FOCUS: Record<ArtifactTipo, string> = {
  career_map:
    "Organize a trajetória (período, papel, escopo, virada de cada posição), os padrões que se repetem, as forças recorrentes e os tetos que o mentorado encontrou na carreira.",
  competency_map:
    "Organize as competências discutidas: pilar, nível atual, nível que a próxima cadeira exige, evidência do nível atual e a lacuna. Feche com as prioridades de desenvolvimento.",
  next_chair_map:
    "Organize a cadeira-alvo (papel, escopo, tipo de problema, horizonte), por que essa cadeira, cada requisito e sua situação (atendido/parcial/não atendido) com evidência, a distância até lá, hipóteses alternativas e riscos da escolha.",
};

export function artifactSystemPrompt(tipo: ArtifactTipo): string {
  return `${GENERATION_RULES}\n\n${ARTIFACT_FOCUS[tipo]}`;
}
