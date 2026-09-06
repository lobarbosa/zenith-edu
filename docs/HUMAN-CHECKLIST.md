# Checklist de construção humana

Levantado numa revisão completa do projeto. Nada abaixo pode ser feito por
mim — exige uma conta, uma credencial ou uma decisão de produto. Enquanto
esses itens estiverem pendentes, nenhuma entrega nova deve avançar; o
trabalho de código da Fase 0 está pronto, mas nunca rodou de ponta a ponta.

Atualize este arquivo conforme os itens forem resolvidos.

## 1. Bloqueante — sem isso, nada roda de verdade

- [ ] **Criar (ou apontar) um projeto Supabase real.** Nada aqui foi ligado
      a um projeto de verdade ainda — `supabase/` só tem os arquivos SQL das
      migrations, sem `supabase link` feito.
- [ ] **Aplicar as três migrations** (`supabase/migrations/0001_init.sql`,
      `0002_diagnostic_tracking.sql`, `0003_executive_profiles_insert.sql`)
      nesse projeto — via `supabase db push` ou colando no SQL Editor do
      dashboard, na ordem.
- [ ] **Configurar as Redirect URLs do Supabase Auth** (Dashboard → 
      Authentication → URL Configuration) para incluir
      `http://localhost:3000/auth/callback` — sem isso o magic link falha
      silenciosamente em dev. Adicionar a URL de produção quando existir.
- [ ] **Pegar uma `ANTHROPIC_API_KEY` real** (console.anthropic.com).
- [ ] **Preencher `.env.local`** (copiar de `.env.local.example`) com:
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.
- [ ] **Definir `MENTOR_EMAILS`** em `.env.local` com pelo menos um e-mail
      real que você consiga acessar — é a allowlist inteira de quem entra
      em `/mentor` nesta fase (sem tabela de papel, ver
      `docs/ARCHITECTURE.md` §6).
- [ ] **Rodar o fluxo inteiro uma vez, ao vivo**: `npm install && npm run
      dev` → login por magic link (e-mail de mentorado) → completar os 8
      blocos do diagnóstico → confirmar que o Perfil Executivo é
      sintetizado → logout → login com o e-mail de `MENTOR_EMAILS` →
      `/mentor` → validar o perfil. Cada peça foi validada isolada (tipos,
      build, RLS lida na policy), mas nunca essa cadeia inteira contra
      Supabase e Anthropic de verdade.

## 2. Decisão de produto — engenharia não decide sozinha

- [ ] **"Rejeitar" um perfil.** Hoje só existe "Validar". Se o mentor
      discordar do rascunho do agente, não há caminho — decidir se, para a
      Fase 0, isso é aceitável (o mentor simplesmente não valida) ou se
      precisa de uma ação de "pedir nova versão"/"rejeitar".
- [ ] **Reorganização dos agentes em Skills.** Levantado no início do
      projeto e nunca retomado: hoje cada peça do agente (prompt,
      classificador de bloco, precificação, síntese de perfil) é um módulo
      TypeScript comum em `src/lib/agents/`. Decidir se e quais dessas
      execuções migram para o formato de Skills.
- [ ] **`ensureMentee` cria uma linha em `mentees` também para o mentor**
      que loga (efeito colateral inofensivo hoje, mas vale confirmar que
      não vira problema quando houver mais de um mentor). Ver
      `docs/ARCHITECTURE.md` §5.5.

## 3. Só dá pra verificar com credenciais reais em mãos

- [ ] **Os IDs de modelo usados no código** (`claude-sonnet-5` na
      conversa, um Haiku para classificação de bloco, `claude-opus-5` na
      síntese — ver `src/lib/agents/pricing.ts`) precisam existir na sua
      conta Anthropic. Se a conta só tiver acesso a outras versões, tanto
      as chamadas de API quanto a tabela de custo por token em
      `pricing.ts` precisam de ajuste.
- [ ] **Custo por diagnóstico medido e registrado** — é item do Definition
      of Done da Fase 0 (`CLAUDE.md`). O código acumula custo por sessão,
      mas isso nunca foi conferido contra uso e preço reais.

## 4. Não bloqueia agora, mas fica registrado

- [ ] **Deploy na Vercel** — decisão explícita foi ficar local por
      enquanto. Retomar quando fizer sentido compartilhar externamente
      (precisa repetir as variáveis de ambiente + Redirect URLs lá também).
