import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { costUsd } from "./pricing";

// SPEC-AGENTS.md §13 descreve os gatilhos, não um prompt literal — este é
// texto de engenharia, não "fonte de verdade" travada como os prompts dos
// agentes. Passe leve em Haiku, roda depois da resposta do copiloto, nunca
// bloqueia o turno (falha vira lista vazia).
const SIGNALS_MODEL = "claude-haiku-4-5";

const SIGNALS_PROMPT = `Você lê um turno de conversa entre um mentorado e um copiloto do
T-Shaped Executive e decide se há sinal para o mentor humano registrar.

Tipos:
contradicao   — o que foi dito conflita com o Perfil Executivo ou artefato anterior
resistencia   — mentorado desvia repetidamente de um tema ou rejeita evidência
risco         — decisão precipitada, insatisfação aguda ou rompimento iminente
avanco        — salto real de clareza ou entrega concreta
fora_de_escopo — tema de saúde, jurídico ou assédio (severidade sempre alta)

Na maioria dos turnos não há sinal nenhum — responda lista vazia.
Responda apenas com JSON, sem texto ao redor:
{"sinais": [{"tipo": "...", "severidade": "baixa|media|alta", "descricao": "..."}]}`;

// Recebe o client admin (service_role): mentor_flags não tem policy de
// insert/select pra mentorado — "nunca é devolvido ao mentorado, nem
// insinuado" (SPEC-AGENTS.md §13; ver RLS em 0004_fase1_schema.sql).
export async function detectSignals(
  admin: SupabaseClient,
  menteeId: string,
  origem: string,
  perfilResumo: string,
  userText: string,
  assistantText: string
) {
  const anthropic = new Anthropic();

  try {
    const response = await anthropic.messages.create({
      model: SIGNALS_MODEL,
      max_tokens: 400,
      system: SIGNALS_PROMPT,
      messages: [
        {
          role: "user",
          content: `Perfil Executivo (resumo):\n${perfilResumo || "(sem perfil validado ainda)"}\n\nMentorado: ${userText}\n\nCopiloto: ${assistantText}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const jsonMatch = textBlock && "text" in textBlock ? textBlock.text.match(/\{[\s\S]*\}/) : null;
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    const sinais = Array.isArray(parsed?.sinais) ? parsed.sinais : [];

    const rows = sinais
      .filter((s: { tipo?: string; descricao?: string }) => s.tipo && s.descricao)
      .map((s: { tipo: string; severidade?: string; descricao: string }) => ({
        mentee_id: menteeId,
        origem,
        tipo: s.tipo,
        severidade: ["baixa", "media", "alta"].includes(s.severidade ?? "") ? s.severidade : "media",
        descricao: s.descricao,
      }));

    if (rows.length > 0) {
      await admin.from("mentor_flags").insert(rows);
    }

    return {
      count: rows.length,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      custoUsd: costUsd(SIGNALS_MODEL, response.usage.input_tokens, response.usage.output_tokens),
    };
  } catch (error) {
    console.error("detectSignals falhou", error);
    return { count: 0, inputTokens: 0, outputTokens: 0, custoUsd: 0 };
  }
}
