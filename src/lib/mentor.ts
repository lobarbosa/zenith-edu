// Escopo mínimo combinado para a Fase 0: allowlist de e-mail por variável
// de ambiente, sem tabela de papel nem admin de usuários. Ver
// docs/ARCHITECTURE.md §6 e a conversa que definiu esse escopo.
export function isMentor(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowlist = (process.env.MENTOR_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase());
}
