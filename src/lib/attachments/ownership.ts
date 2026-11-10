// `attachments.storage_path` é gravável pelo próprio mentorado: a policy
// `attachments_insert_own` só confere o dono da linha, não o caminho. E o
// servidor usa esse caminho com o client admin, que ignora as regras do
// Storage — pra baixar o arquivo e mandar ao modelo (/api/chat) e pra apagar
// (/api/account/delete). Sem esta checagem, uma linha inserida direto pela
// REST API apontando pro caminho de outra pessoa fazia o servidor ler ou
// apagar o arquivo dela em nome de quem pediu.
//
// Todo upload legítimo grava em `<mentee_id>/<conversation_id>/<uuid>-<nome>`
// (POST /api/attachments), então o prefixo é a prova de posse.
export function ownsStoragePath(menteeId: string, storagePath: string): boolean {
  if (!menteeId || storagePath.includes("..")) return false;
  return storagePath.startsWith(`${menteeId}/`);
}
