# Arquitetura — T-Shaped Executive

Documentação técnica de como o sistema **está construído**, mantida junto do
código. Complementa `CLAUDE.md` (regras de trabalho), `SPEC-SOFTWARE.md`
(arquitetura-alvo completa) e `SPEC-AGENTS.md` (comportamento dos agentes) —
esses três descrevem a intenção; este documento descreve o estado real.

Atualizado a cada entrega. Se este documento e o código divergirem, o código
está certo e este documento está desatualizado — corrija-o.

---

## 1. Visão geral

Estamos na **Fase 0** (ver `CLAUDE.md`): autenticação, o Diagnostic Agent
conduzindo o Executive Diagnostic, síntese do Perfil Executivo e validação
pelo mentor. Nenhum copiloto, orquestrador, RAG ou Mentor Console — isso é
Fase 1+.

| Entrega | Status |
|---|---|
| 1. Auth por magic link | ✅ feita |
| 2. `/diagnostico` — conversa em 8 blocos com streaming | ✅ feita |
| 3. Persistência de mensagens e controle de bloco | ✅ feita |
| 4. Síntese do Perfil Executivo em JSON | ⬜ próxima |
| 5. `/mentor` — leitura e validação do perfil | ⬜ pendente |

---

## 2. Stack

- **Next.js 16 (App Router) + TypeScript** — Turbopack, `proxy.ts` (Next 16
  renomeou `middleware.ts` → `proxy.ts`; ver §6)
- **Tailwind v4 + shadcn/ui** — componentes configurados manualmente
  (`ui.shadcn.com` não está acessível no ambiente onde este projeto foi
  desenvolvido; o código gerado é idêntico ao que o CLI produziria)
- **Supabase** — Postgres + Auth (magic link), RLS em todas as tabelas
- **Anthropic API** (`@anthropic-ai/sdk`) — Sonnet na conversa, Haiku na
  classificação de bloco, Opus entra na Entrega 4 (síntese de perfil)
- **Deploy**: Vercel (ainda não configurado)

Sem bibliotecas fora dessa lista. Ver `CLAUDE.md` antes de adicionar algo.

---

## 3. Arquitetura de alto nível

```mermaid
flowchart LR
    subgraph Browser
        UI["/diagnostico — client component<br/>(diagnostic-chat.tsx)"]
    end

    subgraph Vercel["Next.js (route handlers, server components)"]
        Proxy["proxy.ts<br/>sessão + proteção de rota"]
        Page["/diagnostico — server component<br/>busca/cria sessão + histórico"]
        API["/api/diagnostic<br/>persiste, chama o modelo, classifica bloco"]
    end

    subgraph Supabase
        Auth[(Supabase Auth)]
        DB[(Postgres + RLS)]
    end

    Anthropic[(Anthropic API<br/>Sonnet + Haiku)]

    UI -->|fetch streaming| API
    Page -->|SSR| UI
    Proxy -->|getUser| Auth
    Page --> DB
    API --> DB
    API -->|messages.stream| Anthropic
    API -->|classifica bloco| Anthropic
```

Regra de segurança que molda tudo isso: **toda chamada ao modelo passa por
route handler no servidor** (`ANTHROPIC_API_KEY` nunca chega ao browser). O
cliente só fala com `/api/diagnostic`; nunca com a Anthropic diretamente.

---

## 4. Modelo de dados (Fase 0)

Quatro tabelas, RLS ativo em todas — o mentorado só enxerga as próprias
linhas (`mentee_id` → `mentees.user_id = auth.uid()`).

```mermaid
erDiagram
    mentees ||--o{ diagnostic_sessions : possui
    diagnostic_sessions ||--o{ messages : contem
    diagnostic_sessions ||--o{ executive_profiles : gera

    mentees {
        uuid id PK
        uuid user_id FK
        text email
    }
    diagnostic_sessions {
        uuid id PK
        uuid mentee_id FK
        text status "em_andamento | concluida"
        smallint current_block "1-8"
        int input_tokens
        int output_tokens
        numeric custo_usd
    }
    messages {
        uuid id PK
        uuid session_id FK
        text role "user | assistant"
        text content
        smallint block "1-8"
    }
    executive_profiles {
        uuid id PK
        uuid session_id FK
        uuid mentee_id FK
        smallint version
        text status "rascunho_agente | validado"
        jsonb perfil
    }
```

Migrations em `supabase/migrations/`:
- `0001_init.sql` — as 4 tabelas + RLS
- `0002_diagnostic_tracking.sql` — colunas de custo em `diagnostic_sessions`
  (tokens e USD por sessão; ainda não é a tabela `agent_runs` genérica da
  Fase 1, que cobre todos os agentes e turmas)

O mentor (Entrega 5) vai precisar ler dados de mentorados que não são ele —
RLS não permite isso por padrão. A decisão registrada é: acesso do mentor
via `service_role` key no servidor, atrás de uma allowlist de e-mail
(`MENTOR_EMAILS`), sem tabela de papéis — ver `CLAUDE.md` §"Como trabalhar
comigo" e a conversa que definiu esse escopo mínimo.

---

## 5. Fluxos principais

### 5.1 Autenticação (Entrega 1)

1. `/login` (client) chama `supabase.auth.signInWithOtp` direto do browser
   — não precisa de route handler porque é uma chamada ao Supabase, não ao
   modelo.
2. `/auth/callback` (route handler) troca o código pela sessão e roda
   `ensureMentee` — cria a linha em `mentees` no primeiro acesso.
3. `proxy.ts` roda em toda request: atualiza a sessão via cookies e decide
   redirecionar. Rotas `/api/*` **não** são redirecionadas quando não
   autenticadas — respondem 401 direto, porque um redirect (307) quebraria
   um `fetch()` de streaming em andamento (o browser seguiria o redirect e
   trataria o HTML de `/login` como resposta do modelo). Ver commit da
   Entrega 2 — foi um bug real, não uma decisão de design a priori.

### 5.2 Conversa do diagnóstico (Entregas 2 e 3)

```mermaid
sequenceDiagram
    participant C as Cliente (diagnostic-chat.tsx)
    participant P as /diagnostico (server component)
    participant R as /api/diagnostic (route handler)
    participant DB as Supabase
    participant M as Anthropic (Sonnet + Haiku)

    C->>P: GET /diagnostico
    P->>DB: getOrCreateDiagnosticSession(menteeId)
    P->>DB: SELECT messages WHERE session_id
    P-->>C: sessionId + initialMessages (SSR)

    Note over C: se initialMessages vazio, dispara kickoff

    C->>R: POST {sessionId, message}
    R->>DB: valida sessão (RLS garante ownership)
    R->>DB: INSERT message (role=user)
    R->>M: messages.stream(histórico + nova mensagem)
    M-->>C: texto em streaming (token a token)
    Note over R: ao terminar o stream
    R->>DB: INSERT message (role=assistant)
    R->>M: classifica bloco (Haiku, JSON)
    R->>DB: UPDATE diagnostic_sessions (bloco, status, custo)
    R-->>C: marcador + {bloco, concluido} (mesmo stream)
    alt concluido = true
        C->>C: router.refresh()
        Note over P: próxima carga já mostra "diagnóstico concluído"
    end
```

Duas decisões que vale registrar o porquê:

- **Quem controla o bloco.** O prompt do Diagnostic Agent (`SPEC-AGENTS.md`
  §5) já instrui o modelo a conduzir os 8 blocos um de cada vez — ele não
  precisa receber "você está no bloco 3" a cada turno. O que o servidor
  precisa é *saber* em que bloco a conversa está, pra persistir, retomar
  sessão e (nas próximas entregas) liberar a síntese do perfil. Por isso um
  classificador leve em Haiku roda depois de cada resposta do agente,
  lendo só o texto gerado — mesmo padrão do Roteador descrito no
  `SPEC-AGENTS.md`, aplicado aqui num escopo menor.
- **Protocolo cliente-servidor.** O texto da resposta e os metadados de
  bloco (`{bloco, concluido}`) viajam no mesmo stream de texto, separados
  por um marcador (`DIAGNOSTIC_META_MARKER`). Evita uma segunda rodada de
  rede só para descobrir o bloco, à custa de um protocolo caseiro — aceitável
  porque cliente e servidor são o mesmo código, não uma API pública.

### 5.3 Prompt do agente

`src/lib/agents/diagnostic-prompt.ts` concatena o prompt base (comum a
todos os agentes) com o prompt específico do Diagnostic Agent — ambos
transcritos **verbatim** do `SPEC-AGENTS.md` §3 e §5. Esse módulo nunca é
importado por um client component (haveria vazamento do prompt no bundle do
browser); a mensagem de kickoff e o marcador de metadados, que são
inofensivos, ficam separados em `diagnostic-kickoff.ts` justamente para
serem seguros de importar do lado do cliente.

---

## 6. Decisões técnicas registradas

| Decisão | Por quê |
|---|---|
| Rota chama-se `/api/diagnostic`, não `/api/chat` | `SPEC-SOFTWARE.md` reserva `/api/chat` para o copiloto com roteamento entre agentes (Fase 1+). Usar o mesmo nome agora colidiria depois. |
| `proxy.ts` (não `middleware.ts`) | Convenção nova do Next.js 16 — o antigo nome está deprecated nesta versão. |
| `/api/*` responde 401 em vez de redirecionar | Redirect quebraria `fetch()` de streaming se a sessão expirar no meio de uma chamada. |
| Controle de bloco via classificador Haiku separado, não via o próprio Diagnostic Agent | O prompt do agente (fonte de verdade) não deveria ser alterado para emitir metadados estruturados só por conveniência de engenharia — mais barato e mais seguro rodar uma leitura auxiliar depois. |
| shadcn/ui configurado manualmente | `ui.shadcn.com` (usado pelo CLI oficial) não está acessível no ambiente de desenvolvimento; o resultado é equivalente. |
| Sem `agent_runs` genérica ainda | Essa tabela (Fase 1) cobre todos os agentes e cohorts; para a Fase 0, bastam colunas de custo direto em `diagnostic_sessions`. |
| Acesso do mentor via `service_role` + allowlist de e-mail, sem tabela de papel | Decisão explícita para não antecipar "papéis, permissões granulares", que o `CLAUDE.md` exclui da Fase 0. |

---

## 7. Convenções de código

- Código e nomes de arquivo em inglês; conteúdo visível ao mentorado em
  português (`CLAUDE.md`).
- Server component por padrão; client component (`"use client"`) só quando
  há interação (formulário, streaming, estado local).
- Um módulo, uma responsabilidade: prompt do agente, sessão, classificador
  de bloco e precificação são arquivos separados em `src/lib/agents/` e
  `src/lib/`.
- Nenhum segredo (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sai do
  servidor nem entra em `NEXT_PUBLIC_*`.

---

## 8. Próximos passos

1. **Entrega 4 — `POST /api/profile`**: ao concluir a sessão (já detectável
   via `diagnostic_sessions.status = 'concluida'`), sintetizar o Perfil
   Executivo em Opus a partir da transcrição completa, validar contra o
   schema JSON do `SPEC-AGENTS.md` §5 (exatamente três gaps), persistir em
   `executive_profiles` com `status = 'rascunho_agente'`.
2. **Entrega 5 — `/mentor`**: leitura dos perfis pendentes e ação de
   validação (`rascunho_agente` → `validado`), atrás da allowlist de
   e-mail via `service_role`.
3. **Em aberto, fora da ordem das entregas**: revisão da organização dos
   agentes — hoje cada peça (prompt, classificador, precificação) é um
   módulo TypeScript comum sob `src/lib/agents/`; está em avaliação migrar
   as execuções que fizerem sentido para o formato de Skills, para alinhar
   com a prática recomendada de organização de agentes.
