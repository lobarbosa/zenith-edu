-- Fase 1 (SPEC-SOFTWARE.md §6): schema de turmas, jornada, conversas com
-- copilotos, artefatos, corpus de conhecimento (RAG) e observabilidade.
-- Primeira entrega da Fase 1 é só a infraestrutura — orquestrador e
-- copilotos ainda não existem, então algumas tabelas ficam sem política de
-- escrita para o mentorado até a rota que vai popular essa escrita existir.

create extension if not exists vector with schema extensions;

-- Turmas -----------------------------------------------------------------

create table cohorts (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date,
  fim date,
  status text not null default 'planejada'
    check (status in ('planejada', 'ativa', 'concluida')),
  created_at timestamptz default now()
);

alter table mentees add column cohort_id uuid references cohorts(id);
alter table mentees add column papel text not null default 'mentorado'
  check (papel in ('prospect', 'mentorado', 'mentor', 'admin'));

create index mentees_cohort_id_idx on mentees (cohort_id);

-- Estado da jornada --------------------------------------------------------

create table journey_state (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null unique references mentees(id) on delete cascade,
  etapa_atual text not null default 'FIND'
    check (etapa_atual in ('FIND', 'UNDERSTAND', 'CREATE', 'LEAD', 'INFLUENCE', 'MOVE')),
  mes int not null default 1,
  etapas_liberadas text[] not null default array['FIND'],
  atualizado_em timestamptz default now(),
  atualizado_por uuid references mentees(id)
);

-- Conversas com copilotos ---------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  agent_key text not null
    check (agent_key in ('career', 'business', 'value', 'leadership', 'executive')),
  titulo text,
  etapa text,
  criada_em timestamptz default now(),
  ultima_atividade timestamptz default now()
);

create index conversations_mentee_id_idx on conversations (mentee_id);

alter table messages add column conversation_id uuid references conversations(id) on delete cascade;
alter table messages add column agent_key text;
-- `block` só faz sentido pra mensagem de diagnóstico; NULL já satisfaz o
-- check existente (`block between 1 and 8` avalia NULL quando um operando é
-- NULL, e isso passa no CHECK), então basta soltar o NOT NULL.
alter table messages alter column session_id drop not null;
alter table messages alter column block drop not null;
alter table messages add constraint messages_owner_ck
  check (num_nonnulls(session_id, conversation_id) = 1);

create index messages_conversation_id_idx on messages (conversation_id);

-- Anexos enviados numa conversa com copiloto (SPEC-AGENTS.md §12) ----------

create table attachments (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  nome_arquivo text not null,
  tipo_mime text not null,
  tamanho_bytes int not null check (tamanho_bytes <= 15 * 1024 * 1024),
  storage_path text not null,
  criado_em timestamptz default now()
);

create index attachments_mentee_id_idx on attachments (mentee_id);
create index attachments_conversation_id_idx on attachments (conversation_id);

-- Artefatos (mapas e planos) ------------------------------------------------

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  tipo text not null check (tipo in (
    'career_map', 'competency_map', 'next_chair_map',
    'business_map', 'value_creation_map', 'leadership_map',
    'executive_positioning_map', 'executive_movement_plan'
  )),
  versao int not null default 1,
  status text not null default 'rascunho_agente'
    check (status in ('rascunho_agente', 'validado_mentor', 'arquivado')),
  conteudo jsonb not null,
  gerado_por text,
  conversation_id uuid references conversations(id),
  criado_em timestamptz default now(),
  validado_em timestamptz,
  validado_por uuid references mentees(id)
);
create unique index artifacts_versao_uk on artifacts (mentee_id, tipo, versao);
create index artifacts_mentee_id_idx on artifacts (mentee_id);

-- Base de conhecimento (RAG) -------------------------------------------------

create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null check (tipo in ('playbook', 'framework', 'transcricao', 'bibliografia', 'caso')),
  pilar text check (pilar in ('BUSINESS', 'VALUE', 'PEOPLE', 'COMMUNICATION', 'CAREER')),
  etapas text[],
  visibilidade text not null default 'turma' check (visibilidade in ('turma', 'mentor')),
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

create index knowledge_chunks_document_id_idx on knowledge_chunks (document_id);
create index on knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Sinais para o mentor -------------------------------------------------------

create table mentor_flags (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  origem text not null,
  tipo text not null check (tipo in ('contradicao', 'resistencia', 'risco', 'avanco', 'fora_de_escopo')),
  severidade text not null default 'media' check (severidade in ('baixa', 'media', 'alta')),
  descricao text not null,
  lido boolean not null default false,
  criado_em timestamptz default now()
);

create index mentor_flags_mentee_id_idx on mentor_flags (mentee_id);

-- Notas do mentor após encontro ----------------------------------------------

create table mentor_notes (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees(id) on delete cascade,
  etapa text,
  conteudo text not null,
  visivel_ao_mentorado boolean not null default false,
  criado_em timestamptz default now()
);

create index mentor_notes_mentee_id_idx on mentor_notes (mentee_id);

-- Observabilidade -------------------------------------------------------------

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

create index agent_runs_mentee_id_idx on agent_runs (mentee_id);

-- RLS ---------------------------------------------------------------------

alter table cohorts enable row level security;
alter table journey_state enable row level security;
alter table conversations enable row level security;
alter table attachments enable row level security;
alter table artifacts enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
alter table mentor_flags enable row level security;
alter table mentor_notes enable row level security;
alter table agent_runs enable row level security;

-- cohorts: mentorado só lê o nome/status da própria turma. Sem policy de
-- escrita — turma é criada/gerenciada pelo admin via service_role.
create policy "cohorts_select_own" on cohorts
  for select using (
    id in (select cohort_id from mentees where user_id = auth.uid())
  );

-- journey_state: só leitura. Avanço de etapa é ação do mentor
-- (`/api/mentor/advance`, Fase 1, ainda não construída) via service_role —
-- mesma lógica de `/api/mentor/validate` hoje.
create policy "journey_state_select_own" on journey_state
  for select using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

-- conversations: mentorado inicia e atualiza as próprias conversas com
-- copiloto, igual ao padrão já usado em diagnostic_sessions.
create policy "conversations_select_own" on conversations
  for select using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

create policy "conversations_insert_own" on conversations
  for insert with check (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

create policy "conversations_update_own" on conversations
  for update using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

-- messages: políticas do diagnóstico (0001_init.sql) continuam valendo pro
-- caminho session_id. Estas cobrem o caminho conversation_id.
create policy "messages_select_own_conversation" on messages
  for select using (
    conversation_id in (
      select c.id from conversations c
      join mentees m on m.id = c.mentee_id
      where m.user_id = auth.uid()
    )
  );

create policy "messages_insert_own_conversation" on messages
  for insert with check (
    conversation_id in (
      select c.id from conversations c
      join mentees m on m.id = c.mentee_id
      where m.user_id = auth.uid()
    )
  );

-- attachments: mentorado lê/envia os próprios; mentor lê via service_role
-- ao revisar a conversa em /mentor/[menteeId] (SPEC-SOFTWARE.md §6).
create policy "attachments_select_own" on attachments
  for select using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

create policy "attachments_insert_own" on attachments
  for insert with check (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

-- artifacts: mentorado vê o próprio artefato mesmo em rascunho (a UI mostra
-- "em revisão pelo mentor" — SPEC-SOFTWARE.md §10). Insert só em rascunho:
-- mesma trava de auto-validação usada em executive_profiles (0003).
create policy "artifacts_select_own" on artifacts
  for select using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

create policy "artifacts_insert_own_draft" on artifacts
  for insert with check (
    status = 'rascunho_agente'
    and mentee_id in (select id from mentees where user_id = auth.uid())
  );

-- knowledge_documents / knowledge_chunks: sem policy nenhuma de propósito.
-- É o corpus (IP do produto) — só a rota de ingestão e o RAG, ambos rodando
-- com service_role no servidor, tocam essas tabelas. Nunca client-side,
-- nem para o mentorado nem pro mentor (SPEC-SOFTWARE.md §6 e §9).

-- mentor_flags: sem policy de select para o mentorado — "nunca é devolvido
-- ao mentorado, nem insinuado" (SPEC-AGENTS.md §13). Só service_role lê.

-- mentor_notes: mentorado só vê a nota marcada como visível a ele.
create policy "mentor_notes_select_visible" on mentor_notes
  for select using (
    visivel_ao_mentorado = true
    and mentee_id in (select id from mentees where user_id = auth.uid())
  );

-- agent_runs: observabilidade de custo/latência, uso do Mentor Console.
-- Sem policy — lido via service_role, mesmo padrão de acesso cross-mentee
-- já usado em /mentor hoje.
