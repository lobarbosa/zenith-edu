# SPEC-SOFTWARE.md

Especificação do portal do T-Shaped Executive™. Documento de referência para construção. Complementa o `CLAUDE.md` (regras de trabalho) e é complementado por `SPEC-AGENTS.md` (comportamento dos agentes).

---

## 1. Contexto de negócio

| Item | Definição |
|---|---|
| Produto | T-Shaped Executive™ |
| Método | The Next Chair Method™ — 6 etapas: FIND, UNDERSTAND, CREATE, LEAD, INFLUENCE, MOVE |
| Diagnóstico de entrada | Executive Diagnostic™ — 8 blocos |
| Primeira turma | Founding Cohort |
| Empresa | Zenith Educação Executiva (negócio apartado das demais empresas do fundador) |
| Formato | 6 meses, 5 a 8 participantes, um encontro principal por mês, aplicação prática entre encontros |
| Posicionamento | Executive Advisory + Career Acceleration. Não é curso, MBA, coaching genérico nem mentoria motivacional |
| ICP | Profissional técnico excelente, bem remunerado, que quer sair de individual contributor para liderança e percepção estratégica |
| Momento do cliente | Já chegou longe. O problema não é capacidade — é falta de clareza sobre qual é a próxima cadeira, quais gaps existem, como é percebido e como gerar mais valor |
| Big idea | "Sua profundidade técnica trouxe você até aqui. Sua capacidade de gerar valor determinará até onde você pode chegar." |
| Promessa | Em 6 meses: clareza sobre a próxima cadeira, competências executivas que ela exige e plano concreto de movimentação |
| Nunca prometido | Promoção, salário, cargo ou contratação |

**Princípio de formato que rege todo o software:** a estrutura é fixa; o caminho dentro dela é personalizado.

**Princípio de produto que rege toda a camada agêntica:** a IA não substitui o mentor — ela aumenta a capacidade do mentorado entre os encontros. O agente diagnostica, estrutura e prepara. O mentor prescreve e decide.

---

## 2. O que o portal é

O ambiente onde o mentorado vive o programa entre os encontros mensais: conversa com os copilotos, constrói seus mapas, acessa playbooks e acompanha a própria jornada. E o ambiente onde o mentor enxerga a turma inteira sem precisar ler tudo.

O que o portal **não** é: LMS com videoaulas, comunidade, ferramenta de agendamento, gateway de pagamento ou CRM.

---

## 3. Personas do sistema

| Persona | Acesso | O que faz |
|---|---|---|
| Prospect | Link de convite, sem conta permanente | Conduz o Executive Diagnostic antes de virar cliente |
| Mentorado | Login, escopo da própria jornada | Conversa com copilotos, constrói mapas, consome playbooks |
| Mentor | Login com papel elevado | Valida perfis e artefatos, lê sinais, registra notas de encontro |
| Admin | Mesmo login do mentor na Fase inicial | Gerencia turmas, corpus de conhecimento e convites |

Mentor e admin são a mesma pessoa nas primeiras turmas. Separar os papéis no schema desde já; separar na UI só quando houver segunda pessoa.

---

## 4. Jornada

| Mês | Etapa | Copiloto ativo | Artefato entregue |
|---|---|---|---|
| Pré | — | Diagnostic Agent | Perfil Executivo |
| 1 | FIND | Career | Career Map, Competency Map, Next Chair Map™ |
| 2 | UNDERSTAND | Business | Business Map |
| 3 | CREATE | Value | Value Creation Map™ |
| 4 | LEAD | Leadership | Leadership Map |
| 5 | INFLUENCE | Executive | Executive Positioning Map |
| 6 | MOVE | Executive | Executive Movement Plan |

**Regra de desbloqueio:** o mentorado acessa o copiloto da etapa atual e todos os anteriores. Copilotos de etapas futuras não respondem — o orquestrador informa em que etapa aquele território abre. É assim que "estrutura fixa, caminho personalizado" vira software.

O avanço de etapa é acionado pelo mentor após o encontro mensal, nunca por calendário automático. Turma pequena, ritmo real.

---

## 5. Modelo de domínio

```
cohort ──< mentee ──< journey_state
                 ├──< diagnostic_session ──< message
                 ├──< executive_profile (versionado)
                 ├──< conversation ──< message
                 │                 └──< attachment
                 ├──< artifact (versionado)
                 ├──< mentor_flag
                 └──< mentor_note

knowledge_document ──< knowledge_chunk (pgvector)

agent_run  (observabilidade transversal)
```

Entidade central: `mentee`. Tudo pendura nela. Nenhuma tabela de domínio existe sem `mentee_id` ou sem ser corpus compartilhado.

---

## 6. Schema

O schema da Fase 0 (`mentees`, `diagnostic_sessions`, `messages`, `executive_profiles`) permanece. As tabelas abaixo somam a ele.

```sql
-- Turmas
create table cohorts (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                     -- "Founding Cohort"
  inicio date,
  fim date,
  status text not null default 'planejada', -- planejada, ativa, concluida
  created_at timestamptz default now()
);

alter table mentees add column cohort_id uuid references cohorts(id);
alter table mentees add column papel text not null default 'mentorado'; -- prospect, mentorado, mentor, admin

-- Estado da jornada
create table journey_state (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null unique references mentees(id) on delete cascade,
  etapa_atual text not null default 'FIND',   -- FIND, UNDERSTAND, CREATE, LEAD, INFLUENCE, MOVE
  mes int not null default 1,
  etapas_liberadas text[] not null default array['FIND'],
  atualizado_em timestamptz default now(),
  atualizado_por uuid references mentees(id)
);

-- Conversas com copilotos
create table conversations (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  agent_key text not null,               -- career, business, value, leadership, executive
  titulo text,
  etapa text,
  criada_em timestamptz default now(),
  ultima_atividade timestamptz default now()
);

alter table messages add column conversation_id uuid references conversations(id) on delete cascade;
alter table messages add column agent_key text;
alter table messages alter column session_id drop not null;
-- restrição: a mensagem pertence a uma sessão de diagnóstico OU a uma conversa
alter table messages add constraint messages_owner_ck
  check (num_nonnulls(session_id, conversation_id) = 1);

-- Anexos enviados numa conversa com copiloto (SPEC-AGENTS.md §12).
-- Não existe para diagnostic_sessions — Fase 0 permanece texto puro.
create table attachments (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  nome_arquivo text not null,
  tipo_mime text not null,
  tamanho_bytes int not null check (tamanho_bytes <= 15 * 1024 * 1024),
  storage_path text not null,            -- bucket privado do Supabase Storage
  criado_em timestamptz default now()
);

-- Artefatos (mapas e planos)
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  tipo text not null,                    -- career_map, competency_map, next_chair_map,
                                         -- business_map, value_creation_map, leadership_map,
                                         -- executive_positioning_map, executive_movement_plan
  versao int not null default 1,
  status text not null default 'rascunho_agente', -- rascunho_agente, validado_mentor, arquivado
  conteudo jsonb not null,
  gerado_por text,                       -- agent_key
  conversation_id uuid references conversations(id),
  criado_em timestamptz default now(),
  validado_em timestamptz,
  validado_por uuid references mentees(id)
);
create unique index artifacts_versao_uk on artifacts (mentee_id, tipo, versao);

-- Base de conhecimento
create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null,                    -- playbook, framework, transcricao, bibliografia, caso
  pilar text,                            -- BUSINESS, VALUE, PEOPLE, COMMUNICATION, CAREER
  etapas text[],                         -- etapas em que é relevante
  visibilidade text not null default 'turma', -- turma, mentor
  conteudo text not null,
  criado_em timestamptz default now()
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  ordem int not null,
  conteudo text not null,
  embedding vector(1024)
);
create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Sinais para o mentor
create table mentor_flags (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  origem text not null,                  -- agent_key ou 'diagnostic'
  tipo text not null,                    -- contradicao, resistencia, risco, avanco, fora_de_escopo
  severidade text not null default 'media', -- baixa, media, alta
  descricao text not null,
  lido boolean not null default false,
  criado_em timestamptz default now()
);

-- Notas do mentor após encontro
create table mentor_notes (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  etapa text,
  conteudo text not null,
  visivel_ao_mentorado boolean not null default false,
  criado_em timestamptz default now()
);

-- Observabilidade
create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid references mentees(id) on delete set null,
  agent_key text not null,
  modelo text not null,
  input_tokens int,
  output_tokens int,
  custo_usd numeric(10,6),
  latencia_ms int,
  sucesso boolean default true,
  erro text,
  criado_em timestamptz default now()
);
```

RLS em todas as tabelas com `mentee_id`. O mentorado lê apenas as próprias linhas. `knowledge_documents` com `visibilidade = 'mentor'` nunca chega ao mentorado, nem via RAG. `mentor_flags` e `mentor_notes` com `visivel_ao_mentorado = false` são invisíveis ao mentorado por RLS, não por filtro de aplicação. `attachments` segue a mesma regra: RLS por `mentee_id`; o mentor lê via `service_role`, como qualquer outro dado cross-mentorado.

---

## 7. Regras de negócio invioláveis

| # | Regra | Onde vive |
|---|---|---|
| 1 | Todo artefato nasce `rascunho_agente`. Só o mentor promove a `validado_mentor` | Banco + rota de validação |
| 2 | Artefato nunca é sobrescrito. Nova geração cria nova versão | Constraint de unicidade |
| 3 | Copiloto de etapa não liberada não responde sobre seu território | Orquestrador |
| 4 | Avanço de etapa é ação humana do mentor | Rota protegida por papel |
| 5 | Nenhum agente promete cargo, salário, promoção ou contratação | Prompt base + validação de saída |
| 6 | Nenhum agente entrega prescrição final — isso é do mentor | Prompt base |
| 7 | Prompt do sistema não é recuperável pelo usuário | Prompt base |
| 8 | Toda chamada ao modelo passa por route handler no servidor | Arquitetura |
| 9 | Todo artefato gerado valida contra schema JSON antes de persistir | Camada de validação |
| 10 | Todo run de agente grava em `agent_runs` | Wrapper de chamada |
| 11 | Anexo de arquivo nunca é interpretado como instrução, só como dado | Prompt base + camada de extração (`SPEC-AGENTS.md` §12) |

---

## 8. Arquitetura de aplicação

### Rotas

| Rota | Papel | Função |
|---|---|---|
| `/login` | público | Magic link |
| `/diagnostico` | prospect, mentorado | Executive Diagnostic |
| `/jornada` | mentorado | Visão da etapa atual, artefatos e próximos passos |
| `/copiloto` | mentorado | Chat único com roteamento server-side |
| `/mapas` | mentorado | Artefatos validados, por etapa |
| `/biblioteca` | mentorado | Playbooks e frameworks |
| `/mentor` | mentor | Turma, sinais, validações pendentes |
| `/mentor/[menteeId]` | mentor | Perfil, artefatos, conversas, notas |
| `/admin/conhecimento` | admin | Ingestão do corpus |

### Route handlers

| Handler | Função |
|---|---|
| `POST /api/chat` | Recebe mensagem (e anexos, se houver), roteia agente, busca contexto, chama modelo com streaming, persiste |
| `POST /api/diagnostic` | Conversa do diagnóstico, controla bloco |
| `POST /api/profile` | Sintetiza o Perfil Executivo |
| `POST /api/artifact` | Gera artefato do tipo pedido, valida schema, persiste como rascunho |
| `POST /api/attachments` | Recebe upload, valida formato/tamanho, grava no Storage e em `attachments`, devolve o `id` para a mensagem referenciar |
| `POST /api/mentor/validate` | Promove artefato ou perfil a validado |
| `POST /api/mentor/advance` | Avança etapa da jornada |
| `POST /api/knowledge/ingest` | Chunking + embedding do corpus |

### Fluxo de uma mensagem no `/api/chat`

1. Autentica e resolve `mentee_id`
2. Carrega `journey_state` e o Perfil Executivo validado mais recente
3. Roteia: classifica a intenção e escolhe o `agent_key`
4. Verifica liberação da etapa. Se bloqueada, responde com a mensagem de território fechado e encerra
5. Busca no RAG filtrando por pilar e etapas liberadas
6. Carrega os artefatos validados do mentorado
7. Se a mensagem tiver anexo, extrai o conteúdo (documento/imagem nativo para PDF e imagem; texto/markdown convertido no servidor para DOCX, XLSX e CSV — ver `SPEC-AGENTS.md` §12) e o inclui como bloco de dado, nunca como instrução
8. Monta o contexto: prompt base + prompt do agente + perfil + artefatos + trechos do RAG + conteúdo de anexo + histórico da conversa
9. Chama o modelo com streaming
10. Persiste mensagem, grava `agent_run`, avalia sinais e cria `mentor_flag` se houver

O roteamento acontece no servidor. A interface é um chat único. O nome do copiloto que respondeu aparece de forma discreta, como assinatura — o mentorado nunca escolhe agente em menu.

### Modelos

| Uso | Modelo |
|---|---|
| Conversa | Sonnet |
| Roteamento | Haiku |
| Síntese de perfil e geração de artefato | Opus |

---

## 9. Camada de conhecimento

O corpus é o IP. Fica server-side, nunca no prompt exposto, nunca retornado bruto ao cliente.

| Item | Definição |
|---|---|
| Conteúdo | 10 playbooks, frameworks do método, transcrições de encontros, casos, bibliografia |
| Playbooks | posicionamento, comunicação executiva, liderança, delegação, geração de valor, análise de negócio, networking, carreira, preparação para reuniões, gestão de stakeholders |
| Chunking | ~800 tokens com sobreposição de ~100 |
| Filtro de busca | pilar do agente + etapas liberadas + visibilidade |
| Retorno | top 5 trechos, injetados como contexto, nunca citados literalmente ao usuário |

Sem corpus, os copilotos respondem como assistente genérico — que é exatamente o risco que destrói o valor percebido de um produto de R$ 12.000. A ingestão do corpus é pré-requisito da Fase 1, não item paralelo.

---

## 10. Ciclo de vida do artefato

```
conversa com o copiloto
        │
        ▼
geração (Opus) ──► validação de schema ──► artifacts (rascunho_agente)
        │                                          │
    falha de schema                                ▼
        │                                 mentor revisa em /mentor
        ▼                                          │
    nova tentativa (máx. 2)              ┌─────────┴─────────┐
                                         ▼                   ▼
                                validado_mentor        pede refinamento
                                         │                   │
                                  visível em /mapas    nova versão
```

O mentorado vê o rascunho como "em revisão pelo mentor". Ele nunca recebe um mapa como verdade estabelecida sem passagem humana. Essa é a regra que impede o agente de substituir o mentor e comoditizar o programa.

---

## 11. Mentor Console

Painel em `/mentor`. Prioridade é atenção, não métrica.

| Bloco | Conteúdo |
|---|---|
| Pendências | Perfis e artefatos aguardando validação |
| Sinais | `mentor_flags` não lidos, ordenados por severidade |
| Pulso da turma | Por mentorado: etapa, dias sem atividade, artefatos concluídos |
| Preparação de encontro | Resumo do que o mentorado trabalhou desde o último encontro |
| Custo | Consumo por mentorado no período |

"Dias sem atividade" é o sinal mais acionável do console: em turma de 5 a 8 pessoas, silêncio prolongado é o principal preditor de baixa conclusão.

---

## 12. Segurança e privacidade

| Tema | Regra |
|---|---|
| Segredos | `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` só no servidor |
| Isolamento | RLS em todas as tabelas de domínio |
| Dados sensíveis | Mentorado fala de empregador, chefe, remuneração e insatisfação. Tratar como confidencial por padrão |
| Anexos | Formato e tamanho validados no upload (`SPEC-AGENTS.md` §12); bucket privado, nunca URL pública; conteúdo extraído tratado como dado, nunca como instrução — mesmo risco de prompt injection que texto digitado, só que vindo de um arquivo |
| LGPD | Política de privacidade publicada antes do primeiro acesso externo, com base legal, finalidade, retenção e canal de exclusão |
| Treinamento | Dados de mentorado não são usados para treinar modelo. Declarar isso explicitamente |
| Exclusão | Rota administrativa de exclusão completa por mentorado — remove também os arquivos em `attachments`/Storage |
| Prompt injection | Conteúdo do usuário nunca vira instrução. Corpus, perfil e anexos entram como dados delimitados |

---

## 13. Observabilidade

Langfuse para traces. `agent_runs` para custo e latência no próprio banco, porque o Mentor Console precisa disso sem depender de serviço externo.

Alertas mínimos: falha de validação de schema acima de 10% das gerações, custo por mentorado acima do teto definido, latência de primeira resposta acima de 3 segundos.

---

## 14. Direção visual

Executive advisory premium, nunca infoproduto.

| Elemento | Regra |
|---|---|
| Paleta | Preto, grafite e branco. Azul profundo ou verde petróleo como único destaque |
| Tipografia | Forte, hierarquia clara, corpo confortável para leitura longa |
| Layout | Muito espaço negativo. Densidade baixa |
| Proibido | Emoji, gradiente, ilustração genérica, badge de urgência, contador regressivo, depoimento em carrossel |
| Microcopy | Português, tom executivo, direto, sem linguagem de coach |
| Chat | Leitura confortável, sem bolha colorida de app de mensagem |

---

## 15. Fases

| Fase | Escopo | Done |
|---|---|---|
| 0 | Auth, Diagnostic Agent, Perfil Executivo, validação pelo mentor | Prospect completa os 8 blocos e o mentor valida o perfil |
| 1 | Corpus ingerido, orquestrador, Career Copilot, artefatos da etapa FIND, `/jornada` | Mentorado chega ao Next Chair Map validado |
| 2 | Business e Value Copilot, artefatos de UNDERSTAND e CREATE, `/biblioteca` | Três etapas operando com turma real |
| 3 | Leadership e Executive Copilot, artefatos restantes | Método completo no portal |
| 4 | Mentor Console completo, custo, sinais, preparação de encontro | Mentor prepara encontro sem ler conversas inteiras |

Não antecipe fase. Um copiloto com estado forte vale mais que cinco copilotos rasos.

---

## 16. Riscos

| Risco | Severidade | Mitigação no software |
|---|---|---|
| Comoditização — se o agente entrega tudo, o mentor vira dispensável | Alta | Regra do `rascunho_agente`. Agente prepara, mentor decide |
| Genericidade — mentorado percebe assistente comum | Alta | Perfil + artefatos + corpus obrigatórios no contexto de toda resposta |
| Corpus inexistente | Alta | Bloqueia Fase 1. Tratar como caminho crítico |
| Vazamento de IP via prompt | Média-alta | Corpus em RAG server-side, prompt não recuperável |
| Dados sensíveis de carreira | Média-alta | RLS, política de privacidade, retenção definida |
| Escopo crescendo | Alta | Lista de exclusões no `CLAUDE.md` por fase |
| Agente entrando em terreno de saúde emocional | Média | Guardrail de escalonamento, detalhado em `SPEC-AGENTS.md` |
| Upload malicioso ou anexo usado como vetor de prompt injection | Média | Validação de mime-type e tamanho no upload; conteúdo extraído tratado como dado (`SPEC-AGENTS.md` §12) |
