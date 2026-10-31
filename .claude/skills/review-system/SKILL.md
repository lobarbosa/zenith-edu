---
name: review-system
description: "As varreduras de revisão do T-Shaped Executive, cada uma derivada de um bug real já encontrado no projeto: matriz de gates das rotas, enum sem nullable, módulo client exportando função solta, enum cru chegando à tela, cliente admin sem guarda, prompt duplicado. Use quando o pedido for revisar o sistema, procurar o que melhorar, auditar antes de abrir turma, ou quando o usuário retomar o projeto depois de um tempo parado."
---

# Revisar o sistema

Cada varredura aqui achou bug de verdade. Rode as que couberem no escopo —
não é obrigatório rodar todas.

## 0. O ambiente ainda está de pé?

Container recriado perde `node_modules` e `.env.local` (gitignored, e isso
está certo). Sem o `.env.local` não há Supabase nem dev server: dá para
revisar e corrigir, não para validar ao vivo.

```bash
[ -d node_modules ] || npm ci
[ -f .env.local ] && echo "env ok" || echo "sem env — nada de teste ao vivo"
npm run build   # antes do tsc: PageProps/LayoutProps são tipos gerados
npx tsc --noEmit
npm run lint
```

`tsc` antes do build acusa `Cannot find name 'PageProps'` — é staleness de
`.next/types`, não erro real.

## 1. Matriz de gates das rotas

O buraco que mais se repetiu: rota que chama `ensureJourneyState` **cria**
a jornada. Sem gate, um prospect entra no programa sozinho.

```bash
for f in $(find src/app/api -name route.ts | sort); do
  n=${f#src/app/api/}; n=${n%/route.ts}
  a=$(grep -q "getUser()" $f && echo "sim " || echo "NÃO ")
  m=$(grep -q "isMentor" $f && echo "sim " || echo "-   ")
  g=$(grep -q "isInProgram\|fetchIsInProgram" $f && echo "sim " || echo "-   ")
  j=$(grep -q "ensureJourneyState" $f && echo "CRIA JORNADA" || echo "")
  printf "%-30s %s %s %s %s\n" "$n" "$a" "$m" "$g" "$j"
done
```

A regra: **toda rota que cria jornada precisa de gate**, exceto
`/api/mentor/aceitar`, que é o gate. Em 31/10 faltava em três
(`attachments`, `mentor/advance`, `mentor/encontro`).

## 2. Enum sem `.nullable()`

A instrução global manda deixar vazio o campo sem base. Enum estrito
rejeita vazio, o Zod derruba a saída inteira e as três tentativas se
esgotam. Já aconteceu duas vezes.

```bash
grep -rn "z.enum" src/lib/ --include=*.ts | grep -v nullable
```

Os dois de `executive-profile-schema.ts` (`nitidez`,
`confianca_do_diagnostico`) são estritos **de propósito** — o `CLAUDE.md`
trava aquele schema contra a spec. Qualquer outro é suspeito.

## 3. Módulo client exportando função solta

Server component pode **renderizar** componente client; não pode **chamar**
função exportada dele. Compila, quebra em runtime. Quebrou o onboarding em
produção por 24h.

```bash
for f in $(grep -rl '^"use client"' src/ --include=*.tsx --include=*.ts); do
  echo "$f -> $(grep -oP '^export (async )?function \K\w+|^export const \K\w+' $f | tr '\n' ' ')"
done
```

Cada um deve exportar **exatamente um componente**. Função utilitária que
o servidor usa vai para `src/lib/`.

## 4. Enum cru chegando à tela

`artifact-detail.tsx` traduz enum para português com mapas `*_LABEL`.
Quando um campo escapa dessa convenção, costuma escapar de outras — `pilar`
estava sem `.nullable()` **e** sem rótulo ao mesmo tempo.

```bash
grep -c "_LABEL" src/components/artifact-detail.tsx   # quantos mapas existem
grep -on "{item\.\w*}" src/components/artifact-detail.tsx | sort -u
```

Campo de texto livre do modelo (nome, lacuna, quem) renderiza cru e está
certo. Campo de opção fixa precisa de rótulo.

## 5. Cliente admin sem guarda

`createAdminClient()` bypassa RLS inteira. Todo uso precisa de `isMentor`,
posse por `user_id`, ou gate de programa antes.

```bash
for f in $(grep -rl "createAdminClient" src/); do
  g=""; grep -q isMentor $f && g="$g isMentor"
  grep -q "isInProgram\|requireProgram" $f && g="$g gate"
  grep -q 'eq("user_id", user' $f && g="$g posse"
  printf "%-50s %s\n" "${f#src/}" "${g:-⚠ NENHUM}"
done
```

## 6. Segredo ou prompt alcançável pelo browser

```bash
for f in $(grep -rl '^"use client"' src/ --include=*.tsx --include=*.ts); do
  grep -Hn "agents/.*prompt\|supabase/admin\|SERVICE_ROLE\|@anthropic-ai" $f
done
grep -rn "process.env" src/ | grep -v NEXT_PUBLIC_ | sed 's/:.*env\.\([A-Z_]*\).*/ -> \1/' | sort -u
```

Só três módulos de servidor devem aparecer no segundo: `embeddings.ts`,
`mentor.ts`, `admin.ts`.

## 7. Corrida em escrita de estado

`validate` e `reject` usam compare-and-swap (`.eq("status", …)` na escrita).
`advance` não usava, e duplo clique duplicava entrada em
`etapas_liberadas` — que a Jornada exibe como "N de 6".

```bash
grep -rn "\.update(" src/app/api/ -A8 | grep -B2 "\.eq(\"id\"" | head -30
```

Escrita que depende de um valor lido antes precisa reafirmar esse valor no
`.eq`.

## 8. Prompt ou regra duplicada

Regra travada em dois arquivos diverge no dia em que alguém edita só um.

```bash
grep -rc "LIMITES RÍGIDOS" src/lib/agents/*.ts
```

Deve aparecer em **um** arquivo (`base-prompt.ts`). Para mexer ali, leia a
skill `change-agent-prompt`.

## Ao terminar

Separe o que é seu do que é do usuário. Achado em código você corrige;
chave vazada, conector mal apontado, cadastro aberto e revisão jurídica são
dele — e ficam em `docs/HUMAN-CHECKLIST.md`, não num parágrafo solto da
conversa.

Registre o que achou em `docs/ARCHITECTURE.md`, inclusive o que **não**
corrigiu e por quê. Se não deu para validar ao vivo, diga — e diga o que
dá para afirmar com evidência mesmo assim (por exemplo: `/login`
prerenderiza como estático, logo a árvore do componente renderizou no
build).
