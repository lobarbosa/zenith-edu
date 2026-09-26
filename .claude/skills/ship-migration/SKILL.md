---
name: ship-migration
description: "A ordem obrigatória quando uma entrega do T-Shaped Executive inclui migration de banco: escrever, aplicar, conferir, e só então mesclar para main. Use sempre que criar arquivo em supabase/migrations/, alterar schema, ou quando código novo ler coluna que ainda não existe. Inverter a ordem quebra a produção, porque a Vercel faz deploy a partir da main."
---

# Entregar uma migration

A Vercel faz deploy de produção a partir da `main`. Código que lê coluna
inexistente derruba a tela. **A migration roda antes do merge, sempre.**

Já aconteceu de a `main` ficar 20 commits atrás e quebrar `/mentor`
(`docs/HUMAN-CHECKLIST.md` §4). E a migration `0007` ficou dois dias
parada travando a entrega inteira, porque ninguém sabia que era o
bloqueio.

## 1. Escrever

`supabase/migrations/NNNN_nome_em_snake_case.sql`, numeração sequencial.

O cabeçalho do arquivo explica **por que**, não o que — o `alter table`
já diz o que. Veja `0007_perfil_mentee_e_aceite.sql` como referência.

Regras travadas do `CLAUDE.md` que valem para toda tabela nova:

- RLS ativo. O mentorado só enxerga as próprias linhas.
- Coluna nova em tabela existente: **nullable**, ou com default que não
  quebre quem já está no banco.
- Mudar default **não** altera linha existente. Se a intenção for mudar
  quem já existe, escreva o `update` — e pense duas vezes antes.
- Nunca sobrescrever conteúdo versionado (`executive_profiles`,
  `artifacts`): versão nova, a anterior fica.

## 2. Aplicar — confira quem consegue

Tente primeiro pelo MCP do Supabase:

```
mcp__Supabase__list_projects
```

**Confira o `ref` contra a `NEXT_PUBLIC_SUPABASE_URL` do `.env.local`.**
Já esteve apontando para outra conta, e nesse estado `apply_migration`
roda no banco errado ou falha com `relation does not exist`. Se bater,
use `mcp__Supabase__apply_migration`.

Se não bater, **não existe outro caminho automatizado** — conferido:

- PostgREST (service role) não executa DDL; não há RPC `exec_sql`
- não há senha de banco no `.env.local` para `psql`
- o CLI do Supabase existe via `npx` mas precisa de token ou senha

Nesse caso a aplicação é do usuário: Dashboard → SQL Editor → colar o
arquivo → Run. **Pare e peça.** Não mescle enquanto não confirmar.

## 3. Conferir que pegou

Leitura direta, não confie no "rodei lá":

```bash
set -a && . ./.env.local && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/TABELA?select=COLUNA_NOVA&limit=3" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

`column X does not exist` significa que **não** foi aplicada. Conferir
também o que a migration prometeu além do `alter table`: seed, backfill,
índice.

## 4. Só agora, mesclar

`validate-delivery` (os três comandos), depois o PR. Se a alteração mexe
em tela, `test-as-user` antes do merge — migration aplicada não garante
que a tela renderiza.

## 5. Registrar

- `docs/ARCHITECTURE.md`: a decisão e o porquê
- `docs/HUMAN-CHECKLIST.md`: o que sobrou para o usuário fazer
- `docs/PLATFORM-ARCHITECTURE.md`: se mudou o modelo de dados ou um fluxo

## O estado intermediário, que engana

Entre aplicar e mesclar, o banco está à frente do código em produção.
Isso costuma ser inofensivo, mas não sempre: a `0007` mudou o default de
`mentees.papel` para `'prospect'` enquanto o código publicado ainda não
lia `papel`. Por dois dias, cadastro novo nasceu prospect no banco e
recebeu acesso total na tela.

Se a migration muda default, constraint ou trigger que o código novo é
quem passa a respeitar, diga isso ao usuário ao pedir a aplicação — e
encurte a janela.
