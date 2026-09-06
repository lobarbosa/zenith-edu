import Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "./pricing";

// Roteamento/classificação leve roda em Haiku (mesmo padrão do roteador
// descrito no SPEC-AGENTS.md). Isolado do prompt do Diagnostic Agent —
// nunca importe este módulo de um client component.

const CLASSIFIER_MODEL = "claude-haiku-4-5";

const CLASSIFIER_PROMPT = `Você lê a resposta mais recente do Diagnostic Agent numa conversa
estruturada em 8 blocos e determina o estado da conversa.

Blocos:
1 contexto e trajetória
2 ambição
3 gap percebido
4 evidências de preparo
5 competências a evoluir
6 percepção atual
7 stakeholders
8 custo da inércia em 12 meses

Regras:
- "bloco" é o bloco ao qual a próxima pergunta do agente pertence, ou o
  bloco que acabou de fechar se a mensagem for o encerramento.
- "concluido" é true somente se a mensagem for o encerramento do
  diagnóstico (agradecimento final após o bloco 8, sem nova pergunta).

Responda apenas com JSON, sem texto ao redor:
{"bloco": 1-8, "concluido": true|false}`;

export type BlockClassification = {
  bloco: number;
  concluido: boolean;
  inputTokens: number;
  outputTokens: number;
  custoUsd: number;
};

export async function classifyDiagnosticProgress(
  anthropic: Anthropic,
  previousBlock: number,
  assistantText: string
): Promise<BlockClassification> {
  const fallback: BlockClassification = {
    bloco: previousBlock,
    concluido: false,
    inputTokens: 0,
    outputTokens: 0,
    custoUsd: 0,
  };

  try {
    const response = await anthropic.messages.create({
      model: CLASSIFIER_MODEL,
      max_tokens: 100,
      system: CLASSIFIER_PROMPT,
      messages: [
        {
          role: "user",
          content: `Bloco anterior: ${previousBlock}\n\nMensagem do agente:\n${assistantText}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const parsed = textBlock && "text" in textBlock ? JSON.parse(textBlock.text) : null;

    const bloco = Number(parsed?.bloco);
    const concluido = Boolean(parsed?.concluido);
    const usage = response.usage;

    if (!Number.isInteger(bloco) || bloco < 1 || bloco > 8) {
      return { ...fallback, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
    }

    return {
      bloco,
      concluido,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      custoUsd: costUsd(CLASSIFIER_MODEL, usage.input_tokens, usage.output_tokens),
    };
  } catch {
    return fallback;
  }
}
