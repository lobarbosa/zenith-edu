# Origem

Vendorizado de https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
(pasta `.claude/skills/ui-ux-pro-max/` daquele repositório), versão `2.13.0`
(`plugin.json`), MIT License (`LICENSE` nesta pasta).

Trazido para o projeto em 2026-09-06, a pedido explícito, para apoiar a
revisão de UI/UX do portal. Não é mantido por este time — é código e dados
de terceiros, offline (sem chamada de rede, verificado antes de trazer:
nenhum `requests`/`urllib` fazendo request, `subprocess`, `eval`/`exec`
nos scripts).

Uso: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>"
--domain <domínio>` (ou `--stack nextjs` / `--stack shadcn`). Ver o
`SKILL.md` na mesma pasta para a lista de domínios e stacks.

Para atualizar: reclone o repositório upstream e substitua esta pasta
inteira (menos este arquivo).
