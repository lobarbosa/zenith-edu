-- RPC de busca por similaridade no corpus (SPEC-SOFTWARE.md §9: filtro por
-- pilar + etapas liberadas + visibilidade, top 5). supabase-js não expressa
-- o operador `<=>` do pgvector via .select(), daí a função.
-- SECURITY INVOKER (padrão): só é chamada pelo servidor com service_role,
-- que já ignora RLS — não precisa rodar como definer da tabela.
create or replace function match_knowledge_chunks(
  query_embedding vector(1024),
  filter_pilar text,
  filter_etapas text[],
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  conteudo text,
  similarity float
)
language sql
stable
as $$
  select
    kc.id,
    kc.document_id,
    kc.conteudo,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  join knowledge_documents kd on kd.id = kc.document_id
  where kd.visibilidade = 'turma'
    and (filter_pilar is null or kd.pilar = filter_pilar)
    and (filter_etapas is null or kd.etapas is null or kd.etapas && filter_etapas)
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
