---
name: refresh-docs
description: "Como regenerar a versão visual dos documentos do T-Shaped Executive — os prints de tela e o HTML publicado de PLATFORM-ARCHITECTURE, MANUAL-MENTEE e MANUAL-MENTOR. Use depois de qualquer mudança que altere uma tela, um fluxo ou o modelo de dados, e quando o usuário pedir para atualizar a documentação ou os manuais. Sem isso os prints envelhecem em silêncio e passam a documentar um produto que não existe mais."
---

# Atualizar a documentação visual

Os markdowns em `docs/` são a fonte de verdade. `docs/site/` gera a
versão publicada, com os diagramas e os prints.

## O que existe

| Arquivo | O que faz |
| --- | --- |
| `docs/site/build.py` | converte os três markdowns em HTML, sem dependência externa |
| `docs/site/figures.py` | desenha os quatro diagramas em SVG inline |
| `docs/site/style.css` | sistema visual, com os tokens de `src/app/globals.css` |
| `docs/site/shots.mjs` | captura os prints em `docs/images/` |

Dois marcadores no markdown:

- `<!-- FIGURA: id -->` — invisível no GitHub, vira o diagrama no HTML
- `![legenda](images/arquivo.png)` — renderiza nos dois lugares

## Regenerar

```bash
npm run dev > /tmp/dev.log 2>&1 &   # shots.mjs captura contra localhost:3000
sleep 12
node docs/site/shots.mjs             # prints
python3 docs/site/build.py           # HTML
```

O `shots.mjs` usa a mesma injeção de cookie da skill `test-as-user` —
leia ela se algo falhar na autenticação.

Os `.html` gerados ficam fora do repositório (`.gitignore`). Os `.png`
entram, porque o GitHub os renderiza no markdown.

## Republicar

Os três documentos são artifacts com URL fixa. Republique **no mesmo
caminho de arquivo**, passando o `style.css` e as imagens que cada um usa
em `files`, com `root` apontando para o diretório do build.

Cada documento leva só as suas imagens:

| Documento | Prints |
| --- | --- |
| arquitetura | `mentor-roster`, `mentorado-perfil`, `prospect-onboarding` |
| manual-mentorado | `prospect-onboarding`, `mentorado-jornada`, `mentorado-copiloto-widget`, `mentorado-perfil` |
| manual-mentor | `mentor-roster`, `mentor-ficha`, `mentor-console` |

Se o usuário não tiver as URLs à mão, `action: "list"` acha.

## Antes de publicar, olhe

SVG escrito à mão erra alinhamento em silêncio, e captura de elemento
pega região errada enquanto imagem sem dimensão ainda está carregando.
Extraia as figuras para um HTML isolado **com os tokens de cor do
`:root`** e renderize — sem os tokens, `var(--navy)` vira preto e você
"corrige" um problema que não existe.

Procure por: rótulo encavalando caixa vizinha, texto colidindo com a
linha de baixo, seta solta do traço, e `viewBox` curto demais cortando a
última linha.

## Quando os prints mentem

O print mostra o estado do banco no momento da captura. Se as contas de
teste estiverem sem identificação, o roster aparece com e-mail no lugar
de nome e a documentação sugere que a funcionalidade não existe.

Duas contas sintéticas têm identificação preenchida para isso
(`Ana Ribeiro`, `Rafael Tavares`). Se alguém limpar o banco antes da
primeira turma, repovoe antes de recapturar.

`shots.mjs` também esconde o selo de dev do Next e troca os e-mails
pessoais reais por endereços de exemplo. **Não remova nenhuma das duas
coisas** — estes documentos podem ser compartilhados, e o manual do
participante é feito para ir ao cliente.

## Atualizar o texto junto

Print novo com texto velho é pior que print velho. Se a mudança alterou
um fluxo, corrija o markdown antes de regenerar — e confira se algum
diagrama de `figures.py` passou a mentir.
