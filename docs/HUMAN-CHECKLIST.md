# Checklist de construção humana

Levantado numa revisão completa do projeto. Nada abaixo pode ser feito por
mim — exige uma conta, uma credencial ou uma decisão de produto. Enquanto
esses itens estiverem pendentes, nenhuma entrega nova deve avançar; o
trabalho de código da Fase 0 está pronto, mas nunca rodou de ponta a ponta.

Cada item diz quem executa: **Você** ou **Eu** (assim que você entregar o
que a seção 5 pede). Atualize este arquivo conforme os itens forem
resolvidos.

## 1. Bloqueante — sem isso, nada roda de verdade

- [ ] **Você** — Criar (ou apontar) um projeto Supabase real. `supabase/`
      só tem os arquivos SQL das migrations, sem `supabase link` feito.
      1. `supabase.com` → **New Project** → nome sugerido
         `t-shaped-executive` → escolha a região → defina a senha do banco
         (guarde num gerenciador de senhas, o app não usa ela diretamente).
      2. Aguarde o provisionamento (1–2 min).
- [ ] **Você** — Aplicar as três migrations (`supabase/migrations/0001_init.sql`,
      `0002_diagnostic_tracking.sql`, `0003_executive_profiles_insert.sql`),
      nessa ordem.
      1. No projeto: **SQL Editor** → **New query**.
      2. Cole o conteúdo de cada arquivo, um de cada vez, na ordem → **Run**.
      3. Confira em **Table Editor** as 4 tabelas: `mentees`,
         `diagnostic_sessions`, `messages`, `executive_profiles`.
      4. Com o Supabase CLI: `supabase link --project-ref <ref>` e depois
         `supabase db push` faz o mesmo em um passo.
- [ ] **Você** — Configurar as Redirect URLs do Supabase Auth — sem isso o
      magic link falha em silêncio.
      1. **Authentication** → **URL Configuration**.
      2. Site URL: `http://localhost:3000`.
      3. Redirect URLs: adicionar `http://localhost:3000/auth/callback`.
      4. Quando houver produção, repetir com o domínio real.
- [ ] **Você** — Pegar uma `ANTHROPIC_API_KEY` real. Confirmado: este
      ambiente de execução não tem uma chave utilizável pelo app — minha
      conexão aqui usa outro mecanismo de autenticação.
      1. `console.anthropic.com` → **Settings** → **API Keys** → **Create Key**.
      2. Confirmar que a organização tem billing/créditos ativos.
- [ ] **Você** — Separar dois e-mails reais que você acesse: um para testar
      como mentorado, outro como mentor. `MENTOR_EMAILS` é a allowlist
      inteira de `/mentor` nesta fase, e o Supabase trata cada e-mail como
      uma conta separada. Dica pro Gmail: `voce+mentee@gmail.com` e
      `voce+mentor@gmail.com` caem na mesma caixa mas contam como contas
      diferentes.
- [ ] **Você** — Reunir os 5 valores abaixo e entregar (ver seção 5):
      1. **Project Settings → API** no Supabase: Project URL, anon/public
         key, service_role key ("reveal" pra ver).
      2. A `ANTHROPIC_API_KEY` do item acima.
      3. O e-mail escolhido para `MENTOR_EMAILS`.
- [ ] **Eu** — Rodar o fluxo inteiro, ao vivo: criar `.env.local` a partir
      do que você entregar, `npm run dev`, login como mentorado → 8 blocos
      do diagnóstico → perfil sintetizado → login como mentor → `/mentor`
      → validar. Reporto o que funcionou e o que quebrou.

## 2. Decisão de produto — engenharia não decide sozinha

- [ ] **Você** — "Rejeitar" um perfil. Hoje só existe "Validar".
      - A: deixar como está — o mentor simplesmente não valida um rascunho
        ruim, resolve fora do sistema.
      - B: adicionar uma ação de "pedir nova versão"/"rejeitar".
- [ ] **Você** — Reorganização dos agentes em Skills (levantado no início
      do projeto, nunca retomado).
      - A: manter como módulo TypeScript comum em `src/lib/agents/`.
      - B: migrar as execuções que fizerem sentido — dizer qual peça
        começar (prompt do diagnóstico, classificador de bloco, síntese do
        perfil).
- [ ] **Você** — `ensureMentee` cria uma linha em `mentees` também para o
      mentor que loga (inofensivo hoje). Só confirmar: tudo bem continuar
      assim quando houver um segundo mentor?

## 3. Só dá pra verificar com credenciais em mãos

- [ ] **Eu** — Os IDs de modelo usados no código (`claude-sonnet-5` na
      conversa, um Haiku para classificação de bloco, `claude-opus-5` na
      síntese — ver `src/lib/agents/pricing.ts`) precisam existir na sua
      conta. Testo cada um assim que a chave chegar; se algum não existir,
      ajusto a chamada e a tabela de custo por token.
- [ ] **Eu** — Custo por diagnóstico medido e registrado — item do
      Definition of Done. Confiro `diagnostic_sessions.custo_usd` contra o
      uso real durante o teste ao vivo do item 1.

## 4. Não bloqueia agora, mas fica registrado

- [ ] **Você** — Deploy na Vercel — decisão explícita foi ficar local por
      enquanto. Quando fizer sentido: criar o projeto na Vercel, repetir as
      mesmas 5 variáveis nas Environment Variables de lá, e repetir a
      Redirect URL do Supabase Auth com o domínio de produção.

## 5. Como me entregar

Quando tiver os 5 valores do item "Reunir os 5 valores", cole direto na
nossa conversa (não precisa formatar bonito, só não deixar nenhum de fora):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
MENTOR_EMAILS=
```

Cole isso só na conversa comigo, nunca num commit ou arquivo que vá pro
GitHub — `.env.local` já está no `.gitignore`; eu crio o arquivo local a
partir do que você mandar.

---

Versão interativa (com checkbox e progresso) publicada como Artifact:
`https://claude.ai/code/artifact/026d902f-b850-421e-8b27-049e716b9d52`.
