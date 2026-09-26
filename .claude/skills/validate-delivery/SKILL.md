---
name: validate-delivery
description: "Checklist de validação antes de commitar, abrir PR ou dar uma entrega como concluída no T-Shaped Executive. Use sempre que terminar uma alteração de código neste repositório — roda tsc/lint/build na ordem certa, exige abrir a tela quando a alteração toca UI, e confere as regras travadas do CLAUDE.md (RLS, versionamento de perfil, chaves server-side, direção visual, limites do agente). Use também quando o usuário disser 'valida', 'pode commitar?', 'terminei' ou pedir para fechar uma entrega."
---

# Validar entrega

Rode nesta ordem. Cada passo só vale se o anterior passou.

## 1. Os três comandos

```bash
npx tsc --noEmit     # tipos
npm run lint         # eslint
npm run build        # build de produção
```

**`npx next lint` não existe mais** nesta versão do Next — falha com
`Invalid project directory provided`. O script do `package.json` é
`eslint` puro; use `npm run lint`.

O `build` é o único que pega erro de render de server component. Não pule
achando que `tsc` cobre.

## 2. Abrir a tela — obrigatório se a alteração toca UI

Os três comandos acima já passaram, todos os três, e publicaram uma porta
de entrada quebrada em produção (`docs/ARCHITECTURE.md` §20). Eles não
pegam erro de runtime na fronteira server/client, nem caminho condicional
que nenhuma conta do banco exercita.

Se a alteração mexeu em página, componente, rota de API ou navegação,
**use a skill `test-as-user`** e abra a tela logado como o papel afetado.
Não é opcional e não é "quando der tempo".

Três gatilhos que tornam este passo inegociável:

- função saiu de um módulo para outro, ou um módulo ganhou `"use client"`
- a alteração tem `if` que separa estados (com nome / sem nome, com
  perfil / sem perfil, prospect / mentorado)
- mexeu em gate de papel

O que procurar, e como ler o resultado, está na `test-as-user`. O erro de
server component aparece no log do dev server, não no console do browser.

## 3. Regras travadas do CLAUDE.md

Confira só o que a alteração tocou — não releia o projeto inteiro.

**Dados**
- RLS ativo em toda tabela nova. O mentorado só enxerga as próprias linhas.
- Perfil e artefato nascem em `rascunho_agente` / `rascunho_agente`. Nada
  aparece como validado sem ação do mentor.
- `executive_profiles` e `artifacts` são versionados — nova versão, nunca
  `update` no conteúdo existente.
- `perfil` bate com o schema da spec, com exatamente três gaps.

**Segurança**
- `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `VOYAGE_API_KEY` só
  no servidor. Nunca em client component, nunca em `NEXT_PUBLIC_`.
- Toda chamada ao modelo passa por route handler.
- `createAdminClient()` (bypassa RLS) só depois de `isMentor()`, ou em
  escrita cross-policy que o mentorado não pode fazer por policy.
- Nenhum segredo no diff — nem em exemplo, nem em comentário.

**Agente**
- Prompt do sistema é fonte de verdade. Tom e limites não mudam sem pedido
  explícito.
- Os quatro limites rígidos seguem no prompt: não prometer promoção/
  aumento/cargo, não estimar salário da pessoa, não oferecer programa/
  preço/vaga, não entregar plano de ação.
- Prompt não recuperável pelo usuário.

**Visual**
- Preto, grafite, branco e o azul profundo como único destaque.
- Sem emoji, sem gradiente, sem badge de urgência.
- Microcopy em português, tom executivo.

**Convenções**
- Código e nome de arquivo em inglês; conteúdo visível em português.
- Server component por padrão; `"use client"` só com interação.
- Sem comentário explicando o óbvio.

## 4. Fechar a entrega

A Vercel faz deploy de produção a partir da `main`. Trabalho validado que
fica parado na branch de trabalho já quebrou `/mentor` em produção uma vez
(`docs/HUMAN-CHECKLIST.md` §4, a `main` estava 20 commits atrás).

**Se a entrega inclui migration**, a ordem é outra e está na skill
`ship-migration`: aplicar e conferir no banco **antes** de mesclar. Código
que lê coluna inexistente derruba a produção.

**Se a alteração muda uma tela ou um fluxo**, regenere a documentação
visual com a skill `refresh-docs` — senão os prints passam a documentar um
produto que não existe mais.

1. Commit na branch de trabalho, mensagem explicando o *porquê*.
2. Push com `git push -u origin <branch>`.
3. PR pra `main` e merge — **só quando o usuário pedir o PR**.
4. Registrar decisão relevante em `docs/ARCHITECTURE.md`.

## O que esta skill não faz

Não substitui teste de comportamento de agente. Conversa de copiloto,
geração de artefato e detecção de sinal gastam token de verdade e precisam
de critério de leitura — o roteiro está no §11 de
`docs/PLATFORM-ARCHITECTURE.md`. Se a alteração muda comportamento de
agente, diga ao usuário que falta validar ao vivo em vez de dar como
pronta.

Quatro bugs reais deste projeto que passaram pelos três comandos:

| Bug | O que pegou |
| --- | --- |
| Classificador travava a sessão no bloco 1 com JSON em cerca de markdown | rodar o diagnóstico de verdade |
| `voyage-3-lite` gera 512 dimensões, não 1024 | ingerir o corpus de verdade |
| Enum sem `.nullable()` rejeitava a geração inteira | gerar artefato de verdade |
| Server component chamando função de módulo `"use client"` | abrir `/diagnostico` como prospect |

Nenhum deles era erro de tipo.
