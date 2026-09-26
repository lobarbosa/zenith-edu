# Versão visual dos documentos

Os markdowns em `docs/` são a fonte de verdade. Este diretório gera a
versão publicada deles — com os diagramas e os prints de tela.

- `build.py` converte os três markdowns em HTML. Entende os construtos que
  os documentos usam: títulos, tabelas, cercas de código, blockquote,
  listas, negrito e código inline. Sem dependência externa.
- `figures.py` desenha os quatro diagramas em SVG inline. Estrutura em
  `currentColor` (funciona claro e escuro), `var(--navy)` só no elemento
  que carrega o argumento de cada figura.
- `style.css` é o sistema visual, com os tokens de `src/app/globals.css`.
- `shots.mjs` captura os prints em `docs/images/`, contra o `npm run dev`.

Dois marcadores no markdown:

- `<!-- FIGURA: id -->` — invisível no GitHub, vira o diagrama no HTML.
- `![legenda](images/arquivo.png)` — renderiza nos dois lugares.

## Regenerar

```bash
npm run dev                     # o script captura contra localhost:3000
node docs/site/shots.mjs        # prints
python3 docs/site/build.py      # HTML
```

`shots.mjs` esconde o selo de dev do Next e troca os e-mails pessoais reais
do roster por endereços de exemplo — os prints vão para documentação que
pode ser compartilhada.
