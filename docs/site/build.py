#!/usr/bin/env python3
"""Converte os documentos markdown do repositório nas páginas publicadas.

Cobre exatamente os construtos usados nos três arquivos — conferido antes
de escrever: h1-h4, tabelas, cercas de código, blockquote, ul, ol, hr,
negrito e código inline. Sem listas aninhadas e sem links markdown.
"""

import html
import re
import struct
import sys
from pathlib import Path

from figures import FIGURAS

SRC = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent


def inline(text):
    """Negrito, código inline e travessões. Escapa HTML antes de tudo."""
    out = html.escape(text)
    # Código inline primeiro: o conteúdo dele não recebe mais formatação.
    parts = out.split("`")
    for i in range(1, len(parts), 2):
        parts[i] = "\x00CODE\x01" + parts[i] + "\x00/CODE\x01"
    out = "`".join(parts) if len(parts) % 2 == 0 else "".join(parts)
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    out = out.replace("\x00CODE\x01", "<code>").replace("\x00/CODE\x01", "</code>")
    return out


def png_size(path):
    """Largura e altura do cabeçalho IHDR — sem dimensão no <img>, a página
    pula enquanto os prints carregam."""
    with open(path, "rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


def slug(text):
    s = re.sub(r"<[^>]+>", "", text)
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE).strip().lower()
    return re.sub(r"[\s]+", "-", s)


def convert(md):
    """Devolve (html_do_corpo, [(id, titulo_h2)])."""
    lines = md.split("\n")
    out = []
    toc = []
    i = 0
    n = len(lines)

    def flush_para(buf):
        if buf:
            out.append("<p>" + inline(" ".join(buf)) + "</p>")
            buf.clear()

    para = []

    while i < n:
        line = lines[i]

        # figura desenhada: <!-- FIGURA: id -->
        m_fig = re.match(r"^<!-- FIGURA: ([\w-]+) -->$", line.strip())
        if m_fig:
            flush_para(para)
            out.append(FIGURAS[m_fig.group(1)]())
            i += 1
            continue

        # print de tela: ![legenda](images/arquivo.png)
        m_img = re.match(r"^!\[(.*?)\]\((.+?)\)$", line.strip())
        if m_img:
            flush_para(para)
            legenda, src = m_img.group(1), m_img.group(2)
            w, h = png_size(SRC / src)
            out.append(
                f'<figure class="shot"><img src="{src}" alt="{html.escape(legenda)}" '
                f'width="{w}" height="{h}" loading="lazy">'
                f"<figcaption>{inline(legenda)}</figcaption></figure>"
            )
            i += 1
            continue

        # cerca de código
        if line.startswith("```"):
            flush_para(para)
            i += 1
            code = []
            while i < n and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
            continue

        # tabela
        if line.startswith("| ") and i + 1 < n and re.match(r"^\|[\s:-]+\|", lines[i + 1]):
            flush_para(para)
            header = [c.strip() for c in line.strip().strip("|").split("|")]
            i += 2
            rows = []
            while i < n and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            t = ['<div class="table-wrap"><table><thead><tr>']
            t += ["<th>" + inline(c) + "</th>" for c in header]
            t.append("</tr></thead><tbody>")
            for r in rows:
                t.append("<tr>" + "".join("<td>" + inline(c) + "</td>" for c in r) + "</tr>")
            t.append("</tbody></table></div>")
            out.append("".join(t))
            continue

        # blockquote
        if line.startswith(">"):
            flush_para(para)
            quoted = []
            while i < n and lines[i].startswith(">"):
                quoted.append(lines[i].lstrip(">").strip())
                i += 1
            blocks = []
            cur = []
            for q in quoted:
                if q == "":
                    if cur:
                        blocks.append(" ".join(cur))
                        cur = []
                else:
                    cur.append(q)
            if cur:
                blocks.append(" ".join(cur))
            out.append(
                "<blockquote>" + "".join("<p>" + inline(b) + "</p>" for b in blocks) + "</blockquote>"
            )
            continue

        # listas (continuação recuada pertence ao item anterior)
        m_ul = re.match(r"^- (.*)", line)
        m_ol = re.match(r"^\d+\. (.*)", line)
        if m_ul or m_ol:
            flush_para(para)
            tag = "ul" if m_ul else "ol"
            items = []
            while i < n:
                mu = re.match(r"^- (.*)", lines[i])
                mo = re.match(r"^\d+\. (.*)", lines[i])
                if mu and tag == "ul":
                    items.append([mu.group(1)])
                elif mo and tag == "ol":
                    items.append([mo.group(1)])
                elif lines[i].startswith("  ") and lines[i].strip() and items:
                    items[-1].append(lines[i].strip())
                else:
                    break
                i += 1
            out.append(
                f"<{tag}>" + "".join("<li>" + inline(" ".join(it)) + "</li>" for it in items) + f"</{tag}>"
            )
            continue

        # títulos
        m_h = re.match(r"^(#{1,4}) (.*)", line)
        if m_h:
            flush_para(para)
            level = len(m_h.group(1))
            text = m_h.group(2)
            if level == 1:
                i += 1
                continue  # o h1 vira o cabeçalho da página
            ident = slug(text)
            if level == 2:
                toc.append((ident, re.sub(r"^\d+\.\s*", "", text)))
            out.append(f'<h{level} id="{ident}">{inline(text)}</h{level}>')
            i += 1
            continue

        # régua
        if line.strip() == "---":
            flush_para(para)
            out.append("<hr>")
            i += 1
            continue

        if line.strip() == "":
            flush_para(para)
        else:
            para.append(line.strip())
        i += 1

    flush_para(para)
    return "\n".join(out), toc


TEMPLATE = """<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="style.css">

<div class="page">
  <header class="masthead">
    <p class="eyebrow">T-Shaped Executive</p>
    <h1>{h1}</h1>
    <p class="standfirst">{standfirst}</p>
    <span class="audience">{audience}</span>
    <p class="stamp">{stamp}</p>
  </header>

  <div class="body-grid">
    <nav class="toc" aria-label="Seções">
      <p class="toc-title">Neste documento</p>
{toc}
    </nav>

    <main>
{body}
      <footer class="doc-foot">
        {foot}
      </footer>
    </main>
  </div>
</div>
"""

DOCS = [
    {
        "src": "PLATFORM-ARCHITECTURE.md",
        "out": "arquitetura.html",
        "title": "Arquitetura da Plataforma",
        "h1": "Arquitetura da plataforma",
        "standfirst": "O que o T-Shaped Executive é, como está construído e por quê. Técnico e funcional, com o roteiro de validação no fim.",
        "audience": "Referência de engenharia e produto",
        "stamp": "Fonte: docs/PLATFORM-ARCHITECTURE.md · estado do ambiente conferido em 26/09/2026",
        "foot": "Gerado a partir de <code>docs/PLATFORM-ARCHITECTURE.md</code> no repositório <code>lobarbosa/zenith-edu</code>. O diário de decisões de engenharia, em ordem cronológica, fica em <code>docs/ARCHITECTURE.md</code>.",
    },
    {
        "src": "MANUAL-MENTEE.md",
        "out": "manual-mentorado.html",
        "title": "Manual do Participante",
        "h1": "Manual da plataforma",
        "standfirst": "Como usar a plataforma que acompanha o programa: o que cada tela faz, o que esperar do copiloto, e o que a plataforma deliberadamente não faz.",
        "audience": "Para quem participa do programa",
        "stamp": "Fonte: docs/MANUAL-MENTEE.md",
        "foot": "Gerado a partir de <code>docs/MANUAL-MENTEE.md</code> no repositório <code>lobarbosa/zenith-edu</code>.",
    },
    {
        "src": "MANUAL-MENTOR.md",
        "out": "manual-mentor.html",
        "title": "Manual do Consultor",
        "h1": "Manual da plataforma",
        "standfirst": "Como conduzir o programa pela plataforma: o que fazer, quando, e o que cada decisão sua provoca do outro lado.",
        "audience": "Para o consultor",
        "stamp": "Fonte: docs/MANUAL-MENTOR.md",
        "foot": "Gerado a partir de <code>docs/MANUAL-MENTOR.md</code> no repositório <code>lobarbosa/zenith-edu</code>. A arquitetura da plataforma fica em <code>docs/PLATFORM-ARCHITECTURE.md</code>.",
    },
]


def main():
    for doc in DOCS:
        md = (SRC / doc["src"]).read_text()
        body, toc = convert(md)
        toc_html = "\n".join(
            f'      <a href="#{ident}">{html.escape(text)}</a>' for ident, text in toc
        )
        page = TEMPLATE.format(
            title=doc["title"],
            h1=doc["h1"],
            standfirst=doc["standfirst"],
            audience=doc["audience"],
            stamp=doc["stamp"],
            toc=toc_html,
            body=body,
            foot=doc["foot"],
        )
        (OUT / doc["out"]).write_text(page)
        imgs = page.count('class="shot"')
        figs = page.count('class="fig"')
        print(f"{doc['out']}: {len(page):,} bytes · {len(toc)} seções · {figs} diagramas · {imgs} prints")


if __name__ == "__main__":
    sys.exit(main())
