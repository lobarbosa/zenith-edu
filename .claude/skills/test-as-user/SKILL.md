---
name: test-as-user
description: "Como abrir uma tela do T-Shaped Executive logado como prospect, mentorado ou mentor, sem passar pelo login da UI. Use sempre que precisar ver uma tela funcionando de verdade — depois de mexer em /diagnostico, /perfil, /jornada, /copiloto, /mapas, /biblioteca ou qualquer rota de /mentor — e sempre que a alteração tocar a fronteira server/client do App Router. É o único caminho que pega erro de runtime que tsc, lint e build não pegam."
---

# Testar como usuário de verdade

`tsc`, `lint` e `build` verdes dizem que compila. Já publicaram uma porta
de entrada quebrada em produção neste projeto (ver §20 do
`docs/ARCHITECTURE.md`). O que pega esse tipo de erro é abrir a tela.

## Por que o login pela UI não funciona aqui

O browser do container não alcança o Supabase pelo proxy de saída. Clicar
em "Entrar" na tela nunca completa. A sessão precisa ser injetada como
cookie — obtida por um grant de senha real, então é sessão legítima, não
forjada.

## 1. Subir o servidor

```bash
npm run dev > /tmp/dev.log 2>&1 &
sleep 12 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
```

Esperado: `200`. Ao terminar, **não** use `pkill -f "next dev"` — ele
derruba o próprio shell (exit 144) e já engoliu heredoc em andamento mais
de uma vez.

## 2. As contas

Senha comum: `TShapedTeste2026!` (se falhar, redefina pela Admin API —
ver adiante). O estado de cada uma muda; confirme antes de concluir
qualquer coisa a partir do que está escrito aqui.

| Conta | Papel | Serve para |
| --- | --- | --- |
| `mentorado.prospect.teste@example.com` | prospect | onboarding, gates, navegação reduzida |
| `mentorado.ativo.teste@example.com` | mentorado, UNDERSTAND, perfil validado | jornada, perfil, mapas, copiloto |
| `lo.debarbosa+mentor@gmail.com` | mentor (allowlist) | roster, fila, ficha, console |

Redefinir senha de uma conta:

```bash
set -a && . ./.env.local && set +a
UID_X=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users?per_page=50" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  | python3 -c "import json,sys
for u in json.load(sys.stdin)['users']:
    if u['email']=='ALVO@example.com': print(u['id'])")
curl -s -X PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$UID_X" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{"password":"TShapedTeste2026!"}'
```

## 3. O script já existe

`docs/site/shots.mjs` faz tudo: grant de senha, montagem do cookie,
contexto por conta, captura. **Copie a mecânica dele em vez de reescrever.**

As três partes que custam tempo quando redescobertas:

```js
// 1. sessão real por grant de senha
POST ${SUPABASE_URL}/auth/v1/token?grant_type=password
     headers: { apikey: ANON }
     body:    { email, password }

// 2. cookie no formato do @supabase/ssr
const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
const name  = `sb-${REF}-auth-token`;   // REF = subdomínio da SUPABASE_URL
// acima de 3180 chars, fatie em name.0, name.1, ...

// 3. o Chromium do container
executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
```

Playwright está instalado no scratchpad da sessão, não no projeto —
`CLAUDE.md` proíbe dependência nova. Rode de lá.

## 4. O que procurar

**Sempre**: o `h1` da página, e o log do dev server. Um erro de render de
server component aparece como `This page couldn't load` no `h1` e o erro
real no log — não no console do browser.

```bash
tail -30 /tmp/dev.log | grep -v "^ GET\|^ ✓" | head -20
```

**Fronteira server/client**. O caso real: um server component chamou
função exportada de módulo `"use client"`. Compila, quebra em runtime:

> Attempted to call X() from the server but X is on the client.

Pode renderizar componente client; não pode chamar função dele. Se a
alteração moveu função entre módulos, ou um módulo ganhou `"use client"`,
este teste é obrigatório.

**Caminho condicional.** O bug de §20 só disparava para quem tinha `nome`
nulo **e** diagnóstico não concluído — nenhuma conta do banco estava nesse
estado, então nada quebrou até existir uma. Se a alteração tem `if`,
teste a conta que cai em cada ramo, ou crie uma.

**Gate de papel.** Prospect não pode alcançar `/jornada`, `/copiloto`,
`/mapas`, `/biblioteca` (redirect para `/`) nem `POST /api/chat` e
`POST /api/artifact` (403). Teste pela URL direta, não só pelo menu.

## 5. Selo de dev e dados pessoais em print

Se a captura vira documentação, `shots.mjs` já esconde o `nextjs-portal`
(selo de dev, não existe em produção) e troca os e-mails pessoais reais do
roster por endereços de exemplo. Mantenha as duas coisas: esses prints
podem ser compartilhados.

## O que esta skill não faz

Não valida comportamento de agente. Conversa de copiloto, geração de
artefato e detecção de sinal gastam token de verdade e precisam de
critério de leitura — isso está no roteiro do §11 de
`docs/PLATFORM-ARCHITECTURE.md`.
