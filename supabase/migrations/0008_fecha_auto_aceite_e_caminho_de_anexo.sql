-- Três travas que faltavam no banco. As três fecham o mesmo tipo de buraco:
-- a rota de API confere uma regra, mas a tabela aceita a mesma escrita direto
-- pela REST API do Supabase, com a chave anon (pública) e o JWT de qualquer
-- conta — e o cadastro é aberto.
--
-- Esta migration não depende de ordem com o código: todo caminho legítimo do
-- produto já grava dentro do que as novas regras permitem, antes e depois
-- dela. O que muda é só o que a REST API direta deixa de aceitar. Enquanto
-- não for aplicada, os buracos abaixo continuam abertos.
--
-- 1. Autoaceite no programa. `mentees_insert_own` conferia apenas
--    `user_id = auth.uid()`. Quem ainda não tinha linha em `mentees` — ou
--    seja, qualquer conta recém-criada, antes de abrir a primeira tela —
--    podia inserir a própria linha já com `papel = 'mentorado'` e entrar no
--    programa sem diagnóstico, sem perfil validado e sem aceite do mentor.
--    Todos os gates de rota e de página construídos a partir da 0007 confiam
--    nessa coluna. O único insert legítimo é o de `ensureMentee`, que manda
--    só `user_id` e `email` e deixa o resto no default.
--
-- 2. Caminho de anexo. `attachments_insert_own` conferia o dono da linha,
--    não o `storage_path`. O servidor usa esse caminho com a service role —
--    pra baixar o arquivo e entregar ao modelo, pra gerar URL assinada e pra
--    apagar na exclusão de conta. Uma linha apontando pro caminho de outra
--    pessoa fazia o servidor agir sobre o arquivo dela. O código passou a
--    conferir o prefixo também (src/lib/attachments/ownership.ts); esta
--    policy impede que a linha sequer exista.
--
-- 3. Tamanho de mensagem. O limite de 4.000 caracteres vive só na rota. Pela
--    REST API dava pra gravar mensagens de qualquer tamanho na própria
--    conversa, e a transcrição inteira é o que vai pro Opus na síntese do
--    perfil e na geração de artefato — custo arbitrário por conta de quem
--    paga a API. `not valid` aplica a regra só a linhas novas, então a
--    migration não falha por causa de nada que já esteja no banco.

begin;

drop policy "mentees_insert_own" on mentees;

create policy "mentees_insert_own" on mentees
  for insert with check (
    user_id = auth.uid()
    and papel = 'prospect'
    and cohort_id is null
    and aceito_em is null
    and aceito_por is null
  );

drop policy "attachments_insert_own" on attachments;

create policy "attachments_insert_own" on attachments
  for insert with check (
    mentee_id in (select id from mentees where user_id = auth.uid())
    and storage_path like (mentee_id::text || '/%')
    and position('..' in storage_path) = 0
  );

-- A maior resposta possível do agente (max_tokens 2048) fica bem abaixo
-- disto; a maior mensagem do usuário pela rota é de 4.000 caracteres.
alter table messages
  add constraint messages_content_len_ck
  check (char_length(content) <= 32000) not valid;

commit;
