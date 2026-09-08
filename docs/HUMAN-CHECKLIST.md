# Checklist de construção humana

## Fase 4 — Mentor Console — construído, falta validar ao vivo

- [ ] **Testar `/mentor` e `/mentor/[menteeId]` com o mentee de teste real.**
      Painel novo (Sinais, Pulso da turma, Custo, Alertas em `/mentor`;
      Preparação de encontro e Notas em `/mentor/[menteeId]`) passou em
      `tsc`/`lint`/`build`, mas ainda não rodou contra dado real — role
      como mentor, gera um sinal de verdade (conversa que dispare
      `mentor_flags`), confirma que aparece e que "Marcar como lido" some
      da lista. Cria uma nota em `/mentor/[menteeId]` marcando "Visível ao
      mentorado" e confirma que ela aparece em `/jornada` pro mentorado.
- [ ] **Teto de custo por mentorado é um placeholder (US$ 5,00), fixo no
      código.** Ajustar `CUSTO_TETO_USD` em `src/lib/mentor-console.ts`
      quando você decidir o valor real — o spec não definia um número.
- [ ] **Langfuse (pedido pelo `SPEC-SOFTWARE.md` §13) não foi introduzido.**
      Decisão: os 3 alertas mínimos do spec já ficam cobertos só com
      `agent_runs`, sem depender de serviço externo — não vale a pena
      trazer peça nova de stack por enquanto. Revisitar se a necessidade de
      traces detalhados aparecer de verdade.

---

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

## 2. Decisões de produto — resolvidas em 2026-09-07 ✅

- [x] **Reorganização dos agentes em Skills — decisão: opção B.** Migrar
      as execuções que fizerem sentido pra Skills. Levantei um plano
      (qual peça começar, o que muda tecnicamente) antes de mexer em
      código — ver seção logo abaixo desta, ou `docs/ARCHITECTURE.md`.
- [x] **`ensureMentee` cria linha também para o mentor** que loga —
      decisão: não mexer. Só existe um mentor (você) por enquanto; se
      isso mudar no futuro, revisitar.
- [x] **Texto de `/privacidade`** — decisão: mantém como está até você
      levar pra revisão de um advogado antes do primeiro acesso externo
      de verdade. Nenhuma mudança de código pendente da minha parte.
- [x] **XLSX em Anexos** — decisão: mantém de fora, sem XLSX. Não
      retomar por enquanto.

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

- [x] **Redirect URL de produção faltando na allowlist do Supabase** —
      `https://zenith-edu-kappa.vercel.app/auth/callback` (e `/**`) não
      estavam em Authentication → URL Configuration → Redirect URLs, então
      o magic link cairia em `localhost:3000` em vez da URL da Vercel.
      Confirmado adicionado — allowlist agora tem as 4 URLs corretas
      (localhost, domínio próprio, domínio Vercel e wildcard da Vercel).

- [x] **Clique real num magic link** — o item que o LLM Council apontou
      como o de maior risco não testado. Confirmado ao vivo em 2026-09-07:
      pediu o link, recebeu, clicou, caiu autenticado em produção.

## 3. Não bloqueia agora, fica registrado
- [x] **Bucket `attachments` no Storage** — criado por mim, privado, com
      limite de 15 MB e allowlist de mime-type já configurados no próprio
      bucket (redundante com a validação em código, de propósito).

## 4. Bloqueante — achado na validação do magic link em produção — resolvido ✅

- [x] **`/mentor` dando 500 em produção** — a `main` estava 20 commits
      atrás desta branch (a Vercel faz deploy a partir da `main`, e todo
      o trabalho de Fase 1/2/3 nunca tinha sido mesclado de volta).
      Mesclei via PR (#2) — deploy novo já reflete o estado atual do
      produto.
- [x] **`SUPABASE_SERVICE_ROLE_KEY` malformada na Vercel** — o valor
      salvo tinha o JWT correto seguido de uma quebra de linha e o
      conteúdo inteiro de `ANTHROPIC_API_KEY=...` colado atrás (colagem
      de duas linhas do `.env.local` num campo só). Isso quebrava toda
      chamada do client admin (`Headers.set: ... is an invalid header
      value`). Você corrigiu o valor pra conter só o JWT — `/mentor`
      voltou a funcionar.

**Ação pendente sua, não bloqueia o produto**: a `SUPABASE_SERVICE_ROLE_KEY`
e a `ANTHROPIC_API_KEY` reais ficaram expostas em texto puro nos Runtime
Logs da Vercel (e nesta conversa) por causa do vazamento acima — as duas
devem ser tratadas como comprometidas. Você disse que vai trocar pelas
versões finais depois; quando fizer isso, gire as duas chaves (revoga e
gera novas, não só edita o valor) — não é suficiente só corrigir o campo
malformado, porque o valor antigo já vazou pra fora do Vercel.

---

Versão interativa (com checkbox e progresso), ainda refletindo o estado
antes desta validação: `https://claude.ai/code/artifact/026d902f-b850-421e-8b27-049e716b9d52`.
