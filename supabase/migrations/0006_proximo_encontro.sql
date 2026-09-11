-- Data do próximo encontro mensal entre mentor e mentorado.
--
-- Fica em journey_state (não em cohorts) porque o encontro do programa é
-- individual: cada mentorado tem sua agenda com o mentor, e a turma só
-- compartilha o calendário de etapas. Nullable de propósito — enquanto o
-- mentor não marca, a Jornada simplesmente não mostra a linha.
--
-- Quem escreve é o mentor, via POST /api/mentor/encontro (service_role,
-- depois de isMentor()); journey_state não tem policy de escrita para
-- mentorado, mesma regra do avanço de etapa.

alter table journey_state add column proximo_encontro date;
