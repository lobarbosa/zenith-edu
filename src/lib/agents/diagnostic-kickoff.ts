// Mensagem sintética usada só para abrir a conversa — o agente responde
// com a primeira pergunta do bloco 1. Persistida no histórico (é real e
// verdadeira), mas nunca exibida na UI do mentorado.
// Seguro para uso em client components (não contém o prompt do sistema).
export const DIAGNOSTIC_KICKOFF_MESSAGE = "Iniciar o Executive Diagnostic.";

// Delimitador que separa o texto da resposta (para exibir) dos metadados
// de controle de bloco (JSON: { bloco, concluido }) no fim do stream.
// Seguro para uso em client components.
export const DIAGNOSTIC_META_MARKER = "\n<<<DIAGNOSTIC_META>>>";
