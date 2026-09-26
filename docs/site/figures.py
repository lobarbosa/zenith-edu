# Figuras dos documentos. SVG inline, desenhado à mão: estrutura em
# currentColor (funciona claro e escuro) e var(--navy) só no elemento que
# carrega o argumento de cada figura.

DEFS = """<defs>
  <marker id="{p}-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
  </marker>
  <marker id="{p}-seta-navy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" fill="var(--navy)"/>
  </marker>
</defs>"""


def box(x, y, w, h, lines, accent=False, small=False):
    cor = "var(--navy)" if accent else "currentColor"
    fill = "var(--navy-soft)" if accent else "none"
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{fill}" '
        f'stroke="{cor}" stroke-width="1.2" opacity="{0.95 if accent else 0.55}"/>'
    ]
    size = 11 if small else 12
    total = len(lines)
    start = y + h / 2 - (total - 1) * (size + 3) / 2 + size / 3
    for i, line in enumerate(lines):
        weight = "600" if i == 0 else "400"
        op = "1" if i == 0 else "0.72"
        out.append(
            f'<text x="{x + w / 2}" y="{start + i * (size + 3)}" text-anchor="middle" '
            f'font-size="{size}" font-weight="{weight}" fill="{cor}" opacity="{op}">{line}</text>'
        )
    return "".join(out)


def arrow(x1, y1, x2, y2, p, accent=False, label=None, label_dy=-7, dashed=False):
    cor = "var(--navy)" if accent else "currentColor"
    marker = f"{p}-seta-navy" if accent else f"{p}-seta"
    dash = ' stroke-dasharray="4 3"' if dashed else ""
    out = [
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{cor}" stroke-width="1.2" '
        f'opacity="{0.9 if accent else 0.5}" marker-end="url(#{marker})"{dash}/>'
    ]
    if label:
        out.append(
            f'<text x="{(x1 + x2) / 2}" y="{(y1 + y2) / 2 + label_dy}" text-anchor="middle" '
            f'font-size="10" fill="{cor}" opacity="{0.95 if accent else 0.6}">{label}</text>'
        )
    return "".join(out)


def rotulo(x, y, text, anchor="start", size=10, op=0.55, weight="400"):
    return (
        f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" '
        f'font-weight="{weight}" fill="currentColor" opacity="{op}">{text}</text>'
    )


def wrap(p, vb, body, caption, aria):
    return (
        f'<figure class="fig">'
        f'<svg viewBox="{vb}" role="img" aria-label="{aria}">'
        f"{DEFS.format(p=p)}{body}</svg>"
        f"<figcaption>{caption}</figcaption></figure>"
    )


# ---------------------------------------------------------------- ciclo
def ciclo_de_vida():
    p = "cv"
    w, gap = 122, 148
    xs = [10 + i * gap for i in range(6)]
    nodes = [
        ["Cadastro", "papel: prospect"],
        ["Identificação", "nome, cargo"],
        ["8 blocos", "diagnóstico"],
        ["Perfil", "rascunho"],
        ["Perfil", "validado"],
        ["Mentorado", "FIND, mês 1"],
    ]
    b = []
    for i, (x, lines) in enumerate(zip(xs, nodes)):
        b.append(box(x, 44, w, 50, lines, accent=(i == 5)))
    for i in range(5):
        acc = i in (3, 4)
        b.append(arrow(xs[i] + w + 3, 69, xs[i + 1] - 3, 69, p, accent=acc))
    # Os dois atos humanos ficam rotulados ACIMA das caixas: o vão entre elas
    # é estreito demais para o texto e a legenda encavalava nos vizinhos.
    for i, lbl in ((3, "mentor valida"), (4, "mentor aceita")):
        mx = (xs[i] + w + xs[i + 1]) / 2
        b.append(
            f'<text x="{mx}" y="32" text-anchor="middle" font-size="10" font-weight="600" '
            f'fill="var(--navy)">{lbl}</text>'
        )
        b.append(f'<line x1="{mx}" y1="36" x2="{mx}" y2="44" stroke="var(--navy)" stroke-width="1" opacity="0.5"/>')

    b.append('<line x1="10" y1="124" x2="586" y2="124" stroke="currentColor" stroke-width="1" opacity="0.22"/>')
    b.append('<line x1="602" y1="124" x2="870" y2="124" stroke="var(--navy)" stroke-width="1" opacity="0.45"/>')
    b.append(rotulo(10, 142, "PROSPECT", size=9, op=0.45, weight="600"))
    b.append(rotulo(10, 157, "Enxerga Diagnóstico e Conta", op=0.65))
    b.append(
        f'<text x="602" y="142" font-size="9" font-weight="600" fill="var(--navy)" opacity="0.8">MENTORADO</text>'
    )
    b.append(rotulo(602, 157, "Jornada, Copiloto, Mapas, Biblioteca", op=0.65))
    b.append(
        rotulo(10, 180, "O Perfil Executivo fica legível para a pessoa assim que o mentor valida — antes do aceite, portanto.", op=0.5)
    )

    return wrap(
        p,
        "0 0 880 194",
        "".join(b),
        "Do cadastro ao programa. Os dois únicos passos que exigem ato humano estão em azul: "
        "validar o perfil e aceitar no programa. Antes do aceite, a pessoa é prospect e não "
        "alcança nada do programa.",
        "Fluxo de seis estados, de cadastro a mentorado em FIND, com validação e aceite do mentor como as duas transições humanas.",
    )


# ---------------------------------------------------------------- turno
def turno_copiloto():
    p = "tc"
    b = []
    y = 168
    main = [
        (10, 104, ["Mensagem", "do mentorado"]),
        (152, 126, ["Roteador", "Haiku"]),
        (316, 126, ["Etapa", "efetiva"]),
        (480, 150, ["Copiloto da etapa", "Sonnet, streaming"]),
        (678, 116, ["Resposta", "na tela"]),
    ]
    for x, w, lines in main:
        b.append(box(x, y, w, 50, lines, accent=(x == 480)))
    for i in range(4):
        x1 = main[i][0] + main[i][1] + 3
        x2 = main[i + 1][0] - 3
        b.append(arrow(x1, y + 25, x2, y + 25, p))

    entradas = [
        (400, "Perfil Executivo"),
        (400, ""),
    ]
    ex, ew = 424, 262
    itens = [
        "Perfil Executivo do mentorado",
        "Artefatos já validados",
        "Corpus: top 5 por pilar + etapas liberadas",
        "Texto dos anexos desta mensagem",
    ]
    b.append(f'<rect x="{ex}" y="40" width="{ew}" height="94" rx="3" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.38" stroke-dasharray="4 3"/>')
    b.append(rotulo(ex + 12, 58, "CONTEXTO INJETADO — dado, nunca instrução", size=9, op=0.5, weight="600"))
    for i, it in enumerate(itens):
        b.append(rotulo(ex + 12, 76 + i * 15, "· " + it, size=10, op=0.7))
    b.append(arrow(ex + ew / 2, 138, 555, y - 3, p))

    b.append(arrow(378, y + 53, 378, y + 82, p, dashed=True))
    b.append(rotulo(316, y + 98, "etapa pedida não liberada:", size=10, op=0.6))
    b.append(rotulo(316, y + 112, "o copiloto da etapa atual faz a ponte", size=10, op=0.6))

    b.append(arrow(736, y + 53, 736, y + 82, p, dashed=True))
    b.append(box(636, y + 84, 200, 30, ["Sinais (Haiku) → mentor_flags"], small=True))
    b.append(box(636, y + 122, 200, 30, ["agent_runs: 3 linhas"], small=True))
    b.append(arrow(736, y + 116, 736, y + 120, p, dashed=True))

    return wrap(
        p,
        "0 0 880 330",
        "".join(b),
        "Um turno de conversa com o copiloto. O roteador classifica por etapa, não por copiloto — "
        "e a etapa atual é o destino seguro quando a classificação falha. O que roda depois da "
        "resposta (pontilhado) nunca bloqueia o turno.",
        "Pipeline de um turno: mensagem, roteador Haiku, etapa efetiva, copiloto Sonnet com contexto injetado, resposta, e em seguida detecção de sinais e registro em agent_runs.",
    )


# ---------------------------------------------------------------- jornada
def jornada():
    p = "jr"
    b = []
    w, gap = 126, 145
    xs = [10 + i * gap for i in range(6)]
    etapas = [
        ("1", "FIND", ["Career Map", "Competency Map", "Next Chair Map"]),
        ("2", "UNDERSTAND", ["Business Map"]),
        ("3", "CREATE", ["Value Creation Map"]),
        ("4", "LEAD", ["Leadership Map"]),
        ("5", "INFLUENCE", ["Executive", "Positioning Map"]),
        ("6", "MOVE", ["Executive", "Movement Plan"]),
    ]
    for x, (mes, etapa, arts) in zip(xs, etapas):
        b.append(rotulo(x, 24, f"Mês {mes}", size=10, op=0.45))
        b.append(rotulo(x, 42, etapa, size=12.5, op=1, weight="600"))
        b.append(f'<rect x="{x}" y="52" width="{w}" height="3" fill="currentColor" opacity="0.28"/>')
        for i, a in enumerate(arts):
            b.append(rotulo(x, 122 + i * 14, a, size=10, op=0.62))

    copilotos = [
        (0, 1, "Carreira"),
        (1, 1, "Negócio"),
        (2, 1, "Valor"),
        (3, 1, "Liderança"),
        (4, 2, "Executivo"),
    ]
    for start, span, nome in copilotos:
        x = xs[start]
        width = w + (span - 1) * gap
        acc = span == 2
        cor = "var(--navy)" if acc else "currentColor"
        b.append(
            f'<rect x="{x}" y="68" width="{width}" height="30" rx="3" '
            f'fill="{"var(--navy-soft)" if acc else "none"}" stroke="{cor}" '
            f'stroke-width="1.2" opacity="{0.9 if acc else 0.45}"/>'
        )
        b.append(
            f'<text x="{x + width / 2}" y="{87}" text-anchor="middle" font-size="11" '
            f'font-weight="600" fill="{cor}">{nome}</text>'
        )

    b.append('<line x1="10" y1="168" x2="870" y2="168" stroke="currentColor" stroke-width="1" opacity="0.18"/>')
    b.append(rotulo(10, 186, "O Copiloto Executivo cobre duas etapas, com um artefato para cada uma.", size=10, op=0.6))
    b.append(rotulo(10, 200, "Por isso a liberação é decidida pela etapa e nunca pelo copiloto: abrir INFLUENCE não pode abrir MOVE junto.", size=10, op=0.6))

    return wrap(
        p,
        "0 0 880 212",
        "".join(b),
        "Seis etapas, cinco copilotos, oito artefatos. O descompasso entre 5 e 6 é a razão de "
        "<code>ARTIFACT_ETAPA</code> existir separado do copiloto que gera o artefato.",
        "Linha do tempo de seis meses: cada etapa com seu copiloto e artefatos, com o Copiloto Executivo cobrindo INFLUENCE e MOVE.",
    )


# ---------------------------------------------------------------- artefato
def ciclo_artefato():
    p = "ca"
    b = []
    b.append(box(10, 70, 150, 52, ["Conversa", "com o copiloto"]))
    b.append(box(214, 70, 150, 52, ["Rascunho", "gerado pelo Opus"]))
    b.append(box(418, 70, 150, 52, ["Fila do mentor"], accent=True))
    b.append(box(654, 26, 176, 46, ["Validado"]))
    b.append(box(654, 120, 176, 46, ["Rejeitado", "com motivo"]))

    b.append(arrow(163, 96, 211, 96, p))
    b.append(arrow(367, 96, 415, 96, p))

    # Cotovelos em vez de diagonais: o vão é estreito e a diagonal deixava a
    # seta solta da linha, com o rótulo caindo por cima da caixa vizinha.
    for y_alvo, lbl in ((49, "valida"), (143, "rejeita")):
        b.append(
            f'<path d="M571 96 H 610 V {y_alvo} H 648" fill="none" stroke="var(--navy)" '
            f'stroke-width="1.2" opacity="0.9" marker-end="url(#{p}-seta-navy)"/>'
        )
        b.append(
            f'<text x="610" y="{y_alvo - 8 if y_alvo < 96 else y_alvo + 16}" text-anchor="middle" '
            f'font-size="10" font-weight="600" fill="var(--navy)">{lbl}</text>'
        )

    b.append(
        f'<path d="M742 168 V 196 H 85 V 126" fill="none" stroke="currentColor" stroke-width="1.2" '
        f'opacity="0.5" stroke-dasharray="4 3" marker-end="url(#{p}-seta)"/>'
    )
    b.append(rotulo(414, 190, "nova versão — a anterior nunca é apagada", size=10, op=0.6, anchor="middle"))

    return wrap(
        p,
        "0 0 860 212",
        "".join(b),
        "O ciclo de um artefato. Os dois atos do mentor estão em azul. Rejeitar não apaga nada: "
        "gera a versão seguinte e mantém o histórico.",
        "Ciclo do artefato: conversa, rascunho gerado, fila do mentor, e daí validado ou rejeitado com retorno à conversa para nova versão.",
    )


FIGURAS = {
    "ciclo-de-vida": ciclo_de_vida,
    "turno-copiloto": turno_copiloto,
    "jornada": jornada,
    "ciclo-artefato": ciclo_artefato,
}
