-- Rejeição de perfil/artefato pelo mentor, com justificativa obrigatória
-- (decisão de produto registrada em docs/HUMAN-CHECKLIST.md §2, resolvida:
-- opção B — ação formal de rejeitar, não só deixar sem validar).

alter table executive_profiles drop constraint executive_profiles_status_check;
alter table executive_profiles add constraint executive_profiles_status_check
  check (status in ('rascunho_agente', 'validado', 'rejeitado'));
alter table executive_profiles add column motivo_rejeicao text;
alter table executive_profiles add column rejeitado_em timestamptz;
alter table executive_profiles add column rejeitado_por uuid references auth.users(id);
alter table executive_profiles add constraint executive_profiles_rejeicao_ck
  check (status != 'rejeitado' or motivo_rejeicao is not null);

alter table artifacts drop constraint artifacts_status_check;
alter table artifacts add constraint artifacts_status_check
  check (status in ('rascunho_agente', 'validado_mentor', 'arquivado', 'rejeitado'));
alter table artifacts add column motivo_rejeicao text;
alter table artifacts add column rejeitado_em timestamptz;
alter table artifacts add column rejeitado_por uuid references mentees(id);
alter table artifacts add constraint artifacts_rejeicao_ck
  check (status != 'rejeitado' or motivo_rejeicao is not null);
