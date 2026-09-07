Conteúdo real dos 10 playbooks (`SPEC-SOFTWARE.md` §9), extraídos dos
`.docx` originais e prontos pra ingestão via `POST /api/knowledge/ingest`
assim que `supabase/migrations/0004_fase1_schema.sql` e
`0005_knowledge_search.sql` rodarem e `VOYAGE_API_KEY` existir.

`manifest.json` mapeia cada arquivo pro `pilar`/`etapas` que o filtro do
RAG usa (`SPEC-AGENTS.md` §1, §2). Uma divergência foi encontrada e
resolvida: os dois arquivos abaixo se autodeclaram "Pilar: People &
Relationships" no cabeçalho do documento, mas `SPEC-AGENTS.md` §1 os
atribui ao Executive Copilot (`COMMUNICATION`). Decisão do usuário: seguir
a spec, não o cabeçalho do documento.

- `networking.txt`
- `gestao-de-stakeholders.txt`

Isso significa que esses dois só ficam visíveis via RAG a partir de
INFLUENCE (mês 5, Executive Copilot), não LEAD (mês 4, Leadership
Copilot) como o cabeçalho do documento sugeriria.

Script de ingestão ainda não existe — é o próximo passo, construído e
testado junto (não antes) das migrations rodarem, seguindo a mesma
disciplina do resto do projeto: não valido no vácuo.
