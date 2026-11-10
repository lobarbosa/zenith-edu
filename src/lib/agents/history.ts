export type ChatTurn = { role: "user" | "assistant"; content: string };

// A Messages API recusa (400) uma conversa que começa por `assistant` e uma
// mensagem de texto vazia. As duas situações nascem de um turno que não
// fechou: a mensagem do usuário é gravada antes do stream, a do agente só
// depois — fechar a aba no meio da resposta deixa uma pergunta sem par.
//
// No copiloto o histórico é uma janela das últimas N linhas. Com um turno
// órfão dentro dela, a paridade vira e a janela passa a começar por
// `assistant`: a partir daí a conversa falhava com 400 em mensagens
// alternadas, sem erro visível de causa. Mensagens `user` consecutivas a API
// aceita, então basta aparar o começo e tirar o que estiver vazio.
export function normalizeHistory<T extends ChatTurn>(rows: T[]): T[] {
  const comConteudo = rows.filter((m) => m.content.trim().length > 0);
  const primeiroUser = comConteudo.findIndex((m) => m.role === "user");
  return primeiroUser === -1 ? [] : comConteudo.slice(primeiroUser);
}

// Teto de segurança da transcrição enviada ao Opus, em caracteres.
//
// As gerações (perfil e artefato) liam a conversa inteira, sem limite. Em uso
// normal isso é o desejado — o artefato deve se apoiar em tudo que foi dito.
// Mas sem teto nenhum o custo cresce sem parar com a conversa e, no limite,
// estoura o contexto do modelo e a geração passa a falhar sempre.
//
// O valor fica muito acima do uso esperado (um diagnóstico completo tem
// dezenas de milhares de caracteres): só corta em conversa extrema, e quando
// corta preserva o trecho mais recente, que é o que reflete a situação atual.
// É guarda de custo, não curadoria — se um dia for preciso escolher *quais*
// mensagens embasam um artefato, essa é decisão de produto e não mora aqui.
export const TRANSCRIPT_MAX_CHARS = 400_000;

export function capTranscript(transcript: string, maxChars = TRANSCRIPT_MAX_CHARS) {
  if (transcript.length <= maxChars) return { transcript, truncado: false };
  return { transcript: transcript.slice(-maxChars), truncado: true };
}
