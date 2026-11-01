// USD por 1M tokens. Atualize se os preços dos modelos mudarem.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-opus-5": { input: 5, output: 25 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = PRICING[model];

  // Modelo fora da tabela custava 0 em silêncio. "O custo por diagnóstico é
  // medido e registrado" é item do definition of done da Fase 0 — trocar o id
  // de um modelo e não mexer aqui zerava a métrica sem avisar ninguém, e o
  // teto de custo deixava de disparar.
  if (!pricing) {
    console.error(
      JSON.stringify({ evento: "pricing_desconhecido", modelo: model, custo_registrado: 0 })
    );
    return 0;
  }

  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
