import Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "./pricing";
import { ROUTER_SYSTEM_PROMPT } from "./router-prompt";
import { isEtapa, type Etapa } from "./journey";

// Mesmo padrão do classificador de bloco (diagnostic-block-classifier.ts):
// Haiku, JSON puro pedido no prompt, mas às vezes vem em code fence — extrai
// com regex antes do parse.
const ROUTER_MODEL = "claude-haiku-4-5";

export type RouteResult = {
  etapa: Etapa;
  confianca: "alta" | "media" | "baixa";
  intencaoClara: boolean;
  inputTokens: number;
  outputTokens: number;
  custoUsd: number;
};

// `etapaAtual` é o destino de toda falha — parse quebrado, JSON fora do
// enum, Haiku fora do ar. Cair numa etapa fixa faria a falha ser
// indistinguível de um acerto: FIND está sempre liberado, então a resposta
// sairia sem ponte e sem sinal nenhum de que o roteamento falhou.
export async function routeMessage(
  anthropic: Anthropic,
  recentHistory: string,
  message: string,
  etapaAtual: Etapa
): Promise<RouteResult> {
  const fallback: RouteResult = {
    etapa: etapaAtual,
    confianca: "baixa",
    intencaoClara: false,
    inputTokens: 0,
    outputTokens: 0,
    custoUsd: 0,
  };

  try {
    const response = await anthropic.messages.create({
      model: ROUTER_MODEL,
      max_tokens: 100,
      system: ROUTER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Histórico recente:\n${recentHistory || "(sem histórico)"}\n\nMensagem do mentorado:\n${message}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const jsonMatch = textBlock && "text" in textBlock ? textBlock.text.match(/\{[\s\S]*\}/) : null;
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    const usage = response.usage;

    const etapa = typeof parsed?.etapa === "string" && isEtapa(parsed.etapa) ? parsed.etapa : etapaAtual;
    const confianca = ["alta", "media", "baixa"].includes(parsed?.confianca) ? parsed.confianca : "baixa";

    return {
      etapa,
      confianca,
      intencaoClara: Boolean(parsed?.intencao_clara),
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      custoUsd: costUsd(ROUTER_MODEL, usage.input_tokens, usage.output_tokens),
    };
  } catch (error) {
    console.error("routeMessage falhou", error);
    return fallback;
  }
}
