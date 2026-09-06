-- Custo por diagnóstico (Fase 0, DoD): acumulado por sessão, sem a tabela
-- agent_runs genérica da Fase 1 (essa cobre todos os agentes/cohorts, ainda
-- não existem aqui). Suficiente para medir e registrar o custo do diagnóstico.

alter table diagnostic_sessions
  add column input_tokens integer not null default 0,
  add column output_tokens integer not null default 0,
  add column custo_usd numeric(10,6) not null default 0;
