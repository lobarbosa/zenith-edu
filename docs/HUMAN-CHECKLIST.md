# Checklist de construção humana

Levantado numa revisão completa do projeto, atualizado depois do corpus
da Fase 1 ficar real: migrations rodadas, Voyage funcionando, 10
playbooks ingeridos e busca por similaridade testada ao vivo.

## 0. Fase 1 — resolvido ✅

- [x] **Migrations `0004_fase1_schema.sql` e `0005_knowledge_search.sql`**
      rodadas em produção — confirmado lendo as tabelas direto no banco.
- [x] **`VOYAGE_API_KEY`** criada e testada. No caminho, achei que o
      modelo original (`voyage-3-lite`) só gera 512 dimensões, não 1024
      como a decisão registrada assumia — trocado por `voyage-3.5`
      (ver `docs/ARCHITECTURE.md` §6 e §8). Nada da sua parte a fazer
      aqui, já corrigido em código.
- [x] **Conteúdo real dos 10 playbooks** — extraídos, mapeados por
      pilar/etapa (`supabase/seed/playbooks/manifest.json`) e **ingeridos**
      via `scripts/ingest-playbooks.js` (21 chunks no banco). Busca por
      similaridade testada com uma query real, retornou os trechos certos.
      Frameworks/transcrições/casos/bibliografia (os outros tipos que
      `knowledge_documents` aceita) continuam em aberto pra quando fizer
      sentido — os 10 playbooks já cobrem o mínimo da spec.

**Um lembrete operacional, não bloqueio**: sua conta na Voyage está sem
cartão cadastrado, limitada a 3 requisições/minuto. O script já lida com
isso (espera e tenta de novo), mas se algum dia o volume de ingestão
crescer bastante, cadastrar um cartão em https://dashboard.voyageai.com
destrava o limite padrão — não precisa fazer isso agora.

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
