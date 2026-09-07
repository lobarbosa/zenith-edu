// Delimitador que separa o texto da resposta (pra exibir) dos metadados de
// controle (JSON: { agentKey }) no fim do stream — mesmo padrão de
// diagnostic-kickoff.ts. Seguro para uso em client component.
export const CHAT_META_MARKER = "\n<<<CHAT_META>>>";
