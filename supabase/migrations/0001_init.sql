-- Fase 0: mentees, diagnostic_sessions, messages, executive_profiles.
-- RLS ativo em todas. O mentorado só enxerga as próprias linhas.
-- Acesso do mentor (leitura/validação entre mentorados) é feito no servidor
-- com a service role key, fora do escopo do RLS — não há papéis granulares nesta fase.

create table mentees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table diagnostic_sessions (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentees (id) on delete cascade,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida')),
  current_block smallint not null default 1
    check (current_block between 1 and 8),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references diagnostic_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  block smallint not null check (block between 1 and 8),
  created_at timestamptz not null default now()
);

create table executive_profiles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references diagnostic_sessions (id) on delete cascade,
  mentee_id uuid not null references mentees (id) on delete cascade,
  version smallint not null default 1,
  status text not null default 'rascunho_agente'
    check (status in ('rascunho_agente', 'validado')),
  perfil jsonb not null,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid references auth.users (id),
  unique (session_id, version)
);

create index messages_session_id_idx on messages (session_id);
create index diagnostic_sessions_mentee_id_idx on diagnostic_sessions (mentee_id);
create index executive_profiles_mentee_id_idx on executive_profiles (mentee_id);

alter table mentees enable row level security;
alter table diagnostic_sessions enable row level security;
alter table messages enable row level security;
alter table executive_profiles enable row level security;

-- mentees: o próprio usuário lê e cria sua única linha
create policy "mentees_select_own" on mentees
  for select using (user_id = auth.uid());

create policy "mentees_insert_own" on mentees
  for insert with check (user_id = auth.uid());

-- diagnostic_sessions: escopo via mentees.user_id
create policy "diagnostic_sessions_select_own" on diagnostic_sessions
  for select using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

create policy "diagnostic_sessions_insert_own" on diagnostic_sessions
  for insert with check (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

create policy "diagnostic_sessions_update_own" on diagnostic_sessions
  for update using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );

-- messages: escopo via diagnostic_sessions -> mentees.user_id
create policy "messages_select_own" on messages
  for select using (
    session_id in (
      select ds.id
      from diagnostic_sessions ds
      join mentees m on m.id = ds.mentee_id
      where m.user_id = auth.uid()
    )
  );

create policy "messages_insert_own" on messages
  for insert with check (
    session_id in (
      select ds.id
      from diagnostic_sessions ds
      join mentees m on m.id = ds.mentee_id
      where m.user_id = auth.uid()
    )
  );

-- executive_profiles: mentorado só lê (síntese e validação são server-side)
create policy "executive_profiles_select_own" on executive_profiles
  for select using (
    mentee_id in (select id from mentees where user_id = auth.uid())
  );
