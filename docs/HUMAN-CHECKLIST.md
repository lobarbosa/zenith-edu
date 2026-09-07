# Checklist de construção humana

Levantado numa revisão completa do projeto, atualizado depois da Fase 1
inteira ficar validada ao vivo: migrations, corpus, conversa com o
Career Copilot, geração de artefato e validação pelo mentor, tudo
rodado de ponta a ponta contra Supabase e Anthropic reais.

## 0. Fase 1 — resolvido ✅

- [x] **Migrations `0004_fase1_schema.sql` e `0005_knowledge_search.sql`**
      rodadas em produção — confirmado lendo as tabelas direto no banco.
- [x] **`VOYAGE_API_KEY`** criada e testada. No caminho, achei que o
      modelo original (`voyage-3-lite`) só gera 512 dimensões, não 1024
      como a decisão registrada assumia — trocado por `voyage-3.5`
      (ver `docs/ARCHITECTURE.md` §1 e §8). Nada da sua parte a fazer
      aqui, já corrigido em código.
- [x] **Conteúdo real dos 10 playbooks** — extraídos, mapeados por
      pilar/etapa (`supabase/seed/playbooks/manifest.json`) e **ingeridos**
      via `scripts/ingest-playbooks.js` (21 chunks no banco). Busca por
      similaridade testada com uma query real, retornou os trechos certos.
      Frameworks/transcrições/casos/bibliografia (os outros tipos que
      `knowledge_documents` aceita) continuam em aberto pra quando fizer
      sentido — os 10 playbooks já cobrem o mínimo da spec.
- [x] **Fluxo completo validado ao vivo** — mentorado de teste conversou
      com o Career Copilot, gerou os 3 artefatos de FIND, mentor validou
      os 3, `/jornada` mostrou tudo certo. Encontrados e corrigidos 2
      bugs reais nesse processo (campos enum sem `.nullable()` na geração
      de artefato, query ambígua de FK em `/mentor`) — detalhes em
      `docs/ARCHITECTURE.md` §1. Dado de teste apagado depois.

**Um lembrete operacional, não bloqueio**: sua conta na Voyage está sem
cartão cadastrado, limitada a 3 requisições/minuto. O script já lida com
isso (espera e tenta de novo), mas se algum dia o volume de ingestão
crescer bastante, cadastrar um cartão em https://dashboard.voyageai.com
destrava o limite padrão — não precisa fazer isso agora.

**Se/quando for pra produção**: `VOYAGE_API_KEY` também precisa ir nas
Environment Variables da Vercel (mesmo passo já feito com as outras 5).

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

- [ ] **Reorganização dos agentes em Skills.** Levantado no início do
      projeto, nunca retomado.
      - A: manter como módulo TypeScript comum em `src/lib/agents/`.
      - B: migrar as execuções que fizerem sentido — dizer qual peça
        começar.
- [ ] **`ensureMentee` cria linha também para o mentor** que loga.
      Inofensivo hoje — confirmar que continua assim quando houver mais
      de um mentor.

## 1c. Bloqueante — deploy na Vercel — resolvido ✅

- [x] **`Error: Your project's URL and Key are required to create a Supabase client!`**
      em produção — causa era as 6 Environment Variables não estarem
      configuradas na Vercel (as `NEXT_PUBLIC_*` precisam do tipo "Config",
      não "Secret", pra não travar no formulário). Usuário criou as 6 e
      redeployou — confirmado funcionando.
- [x] **Créditos da `ANTHROPIC_API_KEY` esgotados** — achado no meio da
      revalidação do limite de plano de ação fechado (ver
      `docs/ARCHITECTURE.md`, seção "Auditoria pelo LLM Council").
      Repostos pelo usuário; revalidei ao vivo o mesmo ataque que tinha
      violado o limite antes e a correção segurou (ver mesma seção do
      `ARCHITECTURE.md`).

**Ainda não confirmado**: o clique real num magic link — o item que o
LLM Council apontou como o de maior risco não testado (toda validação até
aqui usou sessão mintada via admin API, nunca o e-mail de verdade). Com o
deploy funcionando, agora dá pra fechar isso: acesse a URL da Vercel,
`/login`, digite um e-mail seu de verdade, abra a caixa de entrada e
clique no link. Confirme que cai direto na home, logado.

## 3. Não bloqueia agora, fica registrado
- [ ] **Texto de `/privacidade` não passou por revisão jurídica.** Segue
      fielmente as decisões de produto que você tomou (base legal,
      retenção, canal de exclusão) e os requisitos do `SPEC-SOFTWARE.md`
      §12, mas eu não sou advogado — antes do primeiro acesso externo de
      verdade, vale um advogado revisar o texto.
- [ ] **XLSX não é aceito em Anexos.** Adiado por vulnerabilidade sem
      correção no pacote npm mais óbvio (`xlsx`/SheetJS) — decisão sua,
      registrada em `docs/ARCHITECTURE.md`. Quando quiser retomar, as
      opções levantadas foram `exceljs` (mantido, mas pesado) ou o build
      corrigido do próprio SheetJS via `cdn.sheetjs.com` (leve, mas fora
      do registro npm).
- [x] **Bucket `attachments` no Storage** — criado por mim, privado, com
      limite de 15 MB e allowlist de mime-type já configurados no próprio
      bucket (redundante com a validação em código, de propósito).

---

Versão interativa (com checkbox e progresso), ainda refletindo o estado
antes desta validação: `https://claude.ai/code/artifact/026d902f-b850-421e-8b27-049e716b9d52`.
