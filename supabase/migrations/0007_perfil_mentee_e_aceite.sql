-- Duas correções que andam juntas.
--
-- 1. Identificação do mentorado. `mentees` só tinha e-mail, então todas as
--    telas do mentor (roster, fila de validação, pulso, detalhe) mostravam
--    endereço de e-mail como nome de pessoa. Os campos abaixo são todos
--    nullable: o prospect preenche no início do diagnóstico, e quem já
--    existe segue funcionando com o fallback de e-mail.
--
-- 2. O aceite no programa. `papel` existe desde 0004 mas nunca foi ligado a
--    nada em código, e o default 'mentorado' fazia todo cadastro novo já
--    nascer dentro do programa: qualquer pessoa que criasse conta ganhava
--    jornada em FIND e podia conversar com o copiloto sem nunca ter sido
--    aceita. O default passa a ser 'prospect'; quem já está no banco fica
--    como está, para não expulsar ninguém de uma turma em andamento.

alter table mentees
  add column nome text,
  add column sobrenome text,
  add column data_nascimento date,
  add column cargo text,
  add column empresa text,
  add column linkedin text,
  add column telefone text,
  -- Ano de início da carreira em vez de "anos de experiência": não
  -- envelhece sozinho e não precisa ser recalculado.
  add column carreira_inicio_ano smallint,
  -- Auditoria do aceite: quando e por quem. Nulo enquanto for prospect.
  add column aceito_em timestamptz,
  add column aceito_por uuid references mentees(id);

alter table mentees alter column papel set default 'prospect';

comment on column mentees.papel is
  'prospect: fez ou está fazendo o diagnóstico, sem acesso ao programa. mentorado: aceito pelo mentor, com jornada e copilotos liberados.';

-- A turma que as telas já chamavam de "Founding Cohort" em texto fixo passa
-- a existir de fato, porque o aceite precisa de uma turma para atribuir.
-- Sem UI de turmas nesta fase: uma só, criada aqui, e o aceite aponta pra
-- turma ativa mais antiga.
insert into cohorts (nome, status)
select 'Founding Cohort', 'ativa'
where not exists (select 1 from cohorts);

update mentees
set cohort_id = (select id from cohorts where status = 'ativa' order by created_at limit 1)
where cohort_id is null and papel = 'mentorado';

create index mentees_papel_idx on mentees (papel);
