# Checklist de construção humana

Levantado numa revisão completa do projeto, atualizado depois do início
da Fase 1 (infraestrutura do corpus de conhecimento).

## 0. Fase 1 — bloqueante pra corpus virar realidade

- [ ] **Rodar `supabase/migrations/0004_fase1_schema.sql`** no SQL Editor
      do Supabase, na sequência das três primeiras (mesmo editor de antes).
- [ ] **`VOYAGE_API_KEY`** — criar conta em https://dash.voyageai.com,
      gerar a chave e adicionar em `.env.local` (local) e nas Environment
      Variables da Vercel (produção). Usada só em `/api/knowledge/ingest`.
- [ ] **Conteúdo real dos 10 playbooks/frameworks/transcrições/casos/
      bibliografia** — é o IP do programa, ninguém além de você consegue
      escrever isso. Sem ele, `POST /api/knowledge/ingest` funciona mas o
      corpus fica vazio, e os copilotos (quando existirem) responderiam
      genérico — exatamente o risco que a spec aponta como o mais alto da
      Fase 1.

## 1. Bloqueante — resolvido ✅

Todos os itens abaixo foram entregues e a validação ao vivo (login → 8
blocos do diagnóstico → perfil sintetizado → `/mentor` → validar) rodou
com sucesso em 2026-09-07.

- [x] Projeto Supabase real criado e apontado em `.env.local`.
- [x] As três migrations aplicadas — confirmado via leitura das 4 tabelas.
- [x] Redirect URLs do Supabase Auth configuradas.
- [x] `ANTHROPIC_API_KEY` real obtida e testada contra os 3 modelos usados
      no código.
- [x] `.env.local` preenchido com os 5 valores.
- [x] `MENTOR_EMAILS` definido.
- [x] Fluxo completo rodado ao vivo — encontrou e corrigiu um bug real no
      classificador de bloco (ver `docs/ARCHITECTURE.md` §6 e §8).

**Uma ressalva, não um bloqueio**: a validação não cobriu literalmente o
clique num magic link real — usei uma sessão mintada com o mesmo
mecanismo de cookie do `@supabase/ssr` (PKCE exige o mesmo navegador que
abriu o link, e não há acesso à caixa de entrada real por aqui). O
`/auth/callback` foi revisado por código e a configuração de Redirect
URLs foi confirmada. Se quiser fechar esse último 1%: da próxima vez que
você logar de verdade, é só confirmar que caiu direto na home — não
precisa fazer nada além disso.

## 2. Decisão de produto — ainda em aberto

- [ ] **"Rejeitar" um perfil.** Hoje só existe "Validar".
      - A: deixar como está — o mentor simplesmente não valida um rascunho
        ruim, resolve fora do sistema.
      - B: adicionar uma ação de "pedir nova versão"/"rejeitar".
- [ ] **Reorganização dos agentes em Skills.** Levantado no início do
      projeto, nunca retomado.
      - A: manter como módulo TypeScript comum em `src/lib/agents/`.
      - B: migrar as execuções que fizerem sentido — dizer qual peça
        começar.
- [ ] **`ensureMentee` cria linha também para o mentor** que loga.
      Inofensivo hoje — confirmar que continua assim quando houver mais
      de um mentor.

## 3. Não bloqueia agora, fica registrado

- [ ] **Deploy na Vercel** — decisão explícita foi ficar local por
      enquanto. Quando fizer sentido: criar o projeto na Vercel, repetir
      as mesmas 5 variáveis nas Environment Variables de lá, e repetir a
      Redirect URL do Supabase Auth com o domínio de produção.

---

Versão interativa (com checkbox e progresso), ainda refletindo o estado
antes desta validação: `https://claude.ai/code/artifact/026d902f-b850-421e-8b27-049e716b9d52`.
