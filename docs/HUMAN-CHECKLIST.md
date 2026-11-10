# Checklist de construção humana

## 0. URGENTE — a produção está fora do ar (achado em 10/11)

Tudo abaixo desta seção é secundário enquanto isto não for resolvido.

**O que está acontecendo.** `https://zenith-edu-kappa.vercel.app` responde
`402 Payment Required — DEPLOYMENT_DISABLED` em qualquer rota. A conta da
Vercel (time "Zenith") está bloqueada. O último deploy que saiu é de 03/10;
a produção que existia era a do PR #22, de 26/09. Desde pelo menos 31/10
todo commit recebe da Vercel o status `failure — Account is blocked`.

**O que isso significa para o que eu disse antes.** Os PRs #23 a #27 foram
mesclados e reportados como entregues. Nenhum deles foi publicado. E o
"zero erros de runtime em 7 dias" que usei como sinal de saúde em 31/10 era
um site que não servia requisição nenhuma. Leitura errada minha; a
conferência de deploy que faltava agora está na skill `validate-delivery`.

- [ ] **Desbloquear a conta da Vercel.** Só você faz: Vercel → time
      "Zenith" → Billing. O motivo exato aparece lá (o status aponta pra
      vercel.com/knowledge/why-is-my-account-deployment-blocked).
- [ ] **Antes de religar: aplicar a migration `0008`** (abaixo). Com a
      produção de volta e o cadastro aberto, o furo que ela fecha passa a
      ser explorável de ponta a ponta.
- [ ] **Depois de religar: redeploy da `main`** e a passada ao vivo da
      seção 7 — que agora vale para tudo que nunca rodou em produção
      (PRs #23–#27 e o PR aberto desta rodada), não só para a performance.

### Migration `0008` — aplicar no SQL Editor do Supabase

Arquivo: `supabase/migrations/0008_fecha_auto_aceite_e_caminho_de_anexo.sql`.
O conector do Supabase desta sessão continua ligado a outra conta
(`phvxhahignvsgnhozxrr`, não `vyoqtlkklmcdcjpivtgv`), então não consigo
aplicar daqui. Dashboard → SQL Editor → colar o arquivo → Run.

Ela não depende de ordem com o código — pode entrar antes ou depois do
merge sem quebrar tela nenhuma. O que ela fecha:

1. **Qualquer conta nova conseguia se colocar no programa sozinha.** A
   policy de insert de `mentees` só conferia o dono da linha; pela REST API
   do Supabase dava pra criar a própria linha já com `papel = 'mentorado'`,
   sem diagnóstico, sem perfil validado, sem aceite. Todos os gates que
   construímos desde a `0007` confiam nessa coluna.
2. **Caminho de anexo apontando pro arquivo de outra pessoa.**
3. **Mensagem de tamanho ilimitado** gravada direto no banco, que depois
   vai inteira pro Opus — custo por conta de quem paga a API.

- [ ] Aplicar a `0008`.
- [ ] Conferir que pegou:
      ```sql
      select tablename, policyname, with_check
      from pg_policies
      where policyname in ('mentees_insert_own', 'attachments_insert_own');
      ```
      O `with_check` de `mentees_insert_own` tem que mencionar `papel`.
- [ ] Conferir se alguém já usou o furo — quem está no programa sem
      registro de aceite:
      ```sql
      select id, email, papel, created_at
      from mentees
      where papel <> 'prospect' and aceito_em is null
      order by created_at;
      ```
      Quem entrou antes da `0007` aparece aqui legitimamente (o default era
      `mentorado`). Linha criada **depois** de 26/09 nessa lista é suspeita.

### Duas configurações do Supabase que viraram questão de segurança

- [ ] **"Confirm email" precisa estar LIGADO** (Authentication → Providers
      → Email). O acesso de mentor é decidido só pelo e-mail da conta
      (`MENTOR_EMAILS`). Com a confirmação desligada, quem cadastrar o
      e-mail de um mentor que ainda não tem conta entra como mentor — e o
      mentor lê tudo de todos os mentorados. A seção de Google SSO acima
      trata isso como detalhe de comportamento; é mais que isso.
- [ ] **Fechar o cadastro aberto** continua na lista, e subiu de
      prioridade: os três furos da `0008` só existem porque qualquer pessoa
      na internet consegue uma conta.

### Reconectar o conector do Supabase

- [ ] Apontar o MCP do Supabase para o projeto `vyoqtlkklmcdcjpivtgv`. Com
      ele no lugar eu aplico migration, rodo os advisors de segurança e
      performance do próprio Supabase e simulo consulta — hoje nada disso
      é possível, e foi por isso que a `0008` ficou para você.

## Auth — Google SSO — bloqueante, só você faz

- [ ] **Criar credenciais OAuth no Google Cloud Console** e colar Client
      ID + Client Secret em Supabase → Authentication → Providers →
      Google (marcar "Enabled"). Sem isso o botão "Entrar com Google" em
      `/login` aparece mas todo clique falha. Callback URL a informar no
      Google Cloud Console é a que o próprio painel do Supabase mostra
      nessa tela de configuração do provider.
- [ ] **Conferir se "Confirm email" está ligado ou desligado** em
      Supabase → Authentication → Providers → Email. Os dois casos já
      estão tratados no código (`docs/ARCHITECTURE.md` §10), só não sei
      qual dos dois vale pra este projeto — vale saber pra não estranhar
      o comportamento no teste.

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

## 5. Bloqueante — migration `0007` antes de mesclar pra `main`

A entrega "identificação do mentorado + aceite no programa" adiciona
colunas em `mentees`. O código lê essas colunas. **Se a branch for
mesclada pra `main` antes da migration rodar, a produção quebra** —
`/mentor`, `/mentor/console`, `/diagnostico` e `/conta` passam a
consultar coluna que não existe.

Ordem obrigatória:

1. [ ] Rodar `supabase/migrations/0007_perfil_mentee_e_aceite.sql` no SQL
       Editor do projeto (Dashboard → SQL Editor → colar → Run).
2. [ ] Conferir: `select nome, papel, cohort_id from mentees limit 5;`
       deve responder sem erro, com as cinco linhas existentes ainda em
       `papel = 'mentorado'`.
3. [ ] Conferir: `select nome, status from cohorts;` deve trazer a
       Founding Cohort.
4. [ ] Só então abrir e mesclar o PR pra `main`.

Depois de mesclado, o que mudou para quem usa:

- **Cadastro novo nasce `prospect`.** Faz o diagnóstico e nada mais até
  você clicar "Aceitar no programa" em `/mentor/<id>`. O botão só aparece
  depois que você valida o Perfil Executivo.
- **As contas de teste que já existem continuam como `mentorado`** — nada
  a refazer nelas.
- **O diagnóstico agora começa com um formulário curto** (nome, sobrenome
  e cargo obrigatórios). Quem já concluiu os oito blocos não é devolvido
  pro começo; completa os dados em `/conta`.

### Pendências que isso abre

- [ ] **Revisão jurídica da `/privacidade`** — a página agora lista data
      de nascimento e telefone entre os dados coletados. A revisão por
      advogado já estava pendente; este item entra nela.
- [ ] **Decidir se a data de nascimento é mesmo necessária.** Foi pedida
      explicitamente, mas é o dado mais sensível da lista e o único sem
      uso operacional claro hoje. É opcional no formulário.

## 6. Decisão de produto — cache de prompt na conversa

Não bloqueia nada. Fica registrado porque é sua decisão, não minha.

Hoje nenhuma parte da conversa com os copilotos é cacheável: o material de
RAG muda a cada mensagem e está dentro do `system`, que renderiza antes do
histórico. Resultado: o prompt congelado (~1.400 tokens) e o histórico
inteiro são reenviados a preço cheio em todo turno. O mecanismo está em
`docs/ARCHITECTURE.md` §27.2.

Dá pra recuperar quase tudo isso, mas o caminho que dá o ganho grande move
contexto operacional pra dentro do turno do usuário — e o conteúdo de
arquivo anexado é vetor de injeção declarado. Em outras palavras: troca
postura de segurança por custo.

As três opções, com o que cada uma custa:

| Opção | Ganho | Preço |
| --- | --- | --- |
| `system` em blocos, cache só no prefixo congelado | pequeno — cacheia 1.400 tokens/turno | nenhum; não mexe em comportamento nem em segurança |
| Contexto pro fim de `messages` | grande — cacheia o histórico, que cresce | contexto operacional ganha autoridade de usuário |
| Trocar o modelo da conversa pra um que aceite mensagem de sistema no meio | grande, sem perder autoridade de operador | troca peça do stack; precisa do seu aval |

Qualquer uma precisa antes de `pricing.ts` aprender preço de cache e de
`agent_runs` guardar `cache_read_input_tokens` — ou o custo registrado cai
sem o custo real cair igual, e aí o número do definition of done mente.

Minha recomendação: **não faça nada disso agora.** Sem turma rodando, o
ganho é teórico, e a terceira opção fica mais barata de decidir depois de
você ver custo real de uma turma inteira em `agent_runs`. Já há dado sendo
coletado pra isso.

## 7. Bloqueante pra mesclar — a performance precisa de uma passada ao vivo

> **Atualização de 10/11.** Com a produção fora do ar (seção 0), esta
> passada passou a valer para **tudo** que nunca foi publicado: PRs #23 a
> #27, já na `main`, e o PR aberto desta rodada. O caminho mais curto é o
> preview que a Vercel gera pro PR assim que a conta for desbloqueada —
> testa-se o preview, depois mescla. À lista abaixo somam-se: mandar uma
> mensagem no `/copiloto` e uma no `/diagnostico` (as duas rotas de
> conversa mudaram), anexar um arquivo, e gerar um artefato.

A branch `claude/mentoria-agentica-layer-5da4qv` tem a limpeza e a
performance (ARCHITECTURE.md §28) **validadas por `tsc`, `lint` e `build`, e
não validadas ao vivo.** Não mesclei de propósito.

O motivo é o histórico deste projeto. A mudança toca o carregamento de dados
das treze telas de `(app)` — inclusive o caminho de autenticação de todas
elas. Foi exatamente essa classe de alteração que passou por `tsc`, `lint` e
`build` três vezes e quebrou `/diagnostico` em produção por 24h (§4 aqui, e
ARCHITECTURE.md §23): erro de runtime do App Router não aparece em nenhum dos
três comandos. A skill `test-as-user` existe por causa disso e diz que é o
único caminho que pega.

Não há `.env.local` neste container, então não consigo subir o dev server.

O que precisa ser aberto, logado, antes de mesclar:

- [ ] `/` e `/jornada` como **mentorado** — a Jornada mudou mais (contagem de
      mensagens por copiloto virou `count` do Postgres; confira que os
      números do "Mapa geral de atividades" continuam batendo)
- [ ] `/diagnostico` como **prospect** — é a tela que já quebrou assim
- [ ] `/perfil`, `/mapas`, `/biblioteca`, `/copiloto` como mentorado
- [ ] `/mentor/[menteeId]` como **mentor** — nove consultas em série viraram
      três ondas; confira que transcrição, notas, perfis, artefatos e anexos
      (com URL assinada funcionando) aparecem todos
- [ ] `/mentor/console` — o alerta de falha de schema agora olha as 100
      gerações mais recentes, não o histórico inteiro

Se tudo abrir, mescla. Se alguma quebrar, o erro vai nomear o arquivo.
