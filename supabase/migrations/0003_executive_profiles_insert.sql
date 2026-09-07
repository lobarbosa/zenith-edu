-- A síntese do perfil roda dentro da rota autenticada como o próprio
-- mentorado (não como service_role) — é o sistema inserindo em nome dele,
-- não o mentorado escrevendo livremente. Por isso a policy trava o insert
-- em status = 'rascunho_agente': mesmo que alguém chame a REST API do
-- Supabase direto com o próprio JWT, não dá pra se autovalidar.
create policy "executive_profiles_insert_own_draft" on executive_profiles
  for insert with check (
    status = 'rascunho_agente'
    and mentee_id in (select id from mentees where user_id = auth.uid())
  );
