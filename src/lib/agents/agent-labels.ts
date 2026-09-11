// Rótulo em português da assinatura discreta do copiloto (SPEC-SOFTWARE.md
// §8: "o nome do copiloto que respondeu aparece de forma discreta, como
// assinatura"). Sem prompt aqui — seguro para uso em client component.
export const AGENT_LABELS: Record<string, string> = {
  career: "Copiloto de Carreira",
  business: "Copiloto de Negócio",
  value: "Copiloto de Valor",
  leadership: "Copiloto de Liderança",
  executive: "Copiloto Executivo",
};

// Versão curta para espaços apertados — a timeline da jornada tem seis
// colunas lado a lado, onde "Copiloto de Liderança" não cabe.
export const AGENT_SHORT_LABELS: Record<string, string> = {
  career: "Carreira",
  business: "Negócio",
  value: "Valor",
  leadership: "Liderança",
  executive: "Executivo",
};
