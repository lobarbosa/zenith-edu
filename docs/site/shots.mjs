import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

// A sessão é injetada como cookie porque o browser do container não alcança
// o Supabase pelo proxy — login pela UI não completa. O token vem de um
// grant de senha via curl, então o cookie é real, não forjado.
const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url).pathname, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REF = SUPABASE_URL.replace("https://", "").split(".")[0];
const PASSWORD = "TShapedTeste2026!";
const OUT = new URL("../images", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

async function sessionFor(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`${email}: ${JSON.stringify(data)}`);
  return data;
}

// O @supabase/ssr guarda a sessão como base64- + JSON, fatiada em chunks de
// 3180 chars quando passa do limite de um cookie.
function sessionCookies(session) {
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
  const name = `sb-${REF}-auth-token`;
  const base = { domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax" };

  if (value.length <= 3180) return [{ name, value, ...base }];

  const chunks = [];
  for (let i = 0; i < value.length; i += 3180) {
    chunks.push({ name: `${name}.${chunks.length}`, value: value.slice(i, i + 3180), ...base });
  }
  return chunks;
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

async function contextFor(email) {
  const ctx = await browser.newContext({
    viewport: { width: 1320, height: 860 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  await ctx.addCookies(sessionCookies(await sessionFor(email)));
  return ctx;
}

// Duas limpezas antes de cada print, e só elas:
// 1. o selo de dev do Next (nextjs-portal) não existe em produção;
// 2. o e-mail pessoal real do dono do projeto aparece no roster porque as
//    contas dele ainda não têm nome — trocado por um endereço de exemplo,
//    já que estes prints vão para documentação que pode ser compartilhada.
async function limpar(page) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => {
    const troca = [
      [/lo\.debarbosa\+mentor@gmail\.com/g, "mentor@exemplo.com"],
      [/lo\.debarbosa\+prospect1@gmail\.com/g, "carolina.menezes@exemplo.com"],
      [/lo\.debarbosa@gmail\.com/g, "bruno.almeida@exemplo.com"],
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      for (const [re, sub] of troca) {
        if (re.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(re, sub);
      }
    }
  });
}

async function shot(ctx, path, file, { full = false, wait = 2200, before } = {}) {
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
  if (before) await before(page);
  await limpar(page);
  await page.waitForTimeout(400);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: full });
  const title = await page.locator("h1").first().innerText().catch(() => "—");
  console.log(`${file.padEnd(28)} ${path.padEnd(22)} h1="${title.slice(0, 44)}"`);
  await page.close();
}

// ---------- mentorado ativo ----------
const mentee = await contextFor("mentorado.ativo.teste@example.com");
await shot(mentee, "/jornada", "mentorado-jornada", { full: true });
await shot(mentee, "/perfil", "mentorado-perfil", { full: true });
await shot(mentee, "/mapas", "mentorado-mapas");
await shot(mentee, "/", "mentorado-home");
await shot(mentee, "/jornada", "mentorado-copiloto-widget", {
  before: async (page) => {
    await page.getByRole("button", { name: /copiloto/i }).first().click();
    await page.waitForTimeout(1400);
  },
});
await mentee.close();

// ---------- prospect ----------
const prospect = await contextFor("mentorado.prospect.teste@example.com");
await shot(prospect, "/diagnostico", "prospect-onboarding", { full: true });
await shot(prospect, "/", "prospect-home");
await prospect.close();

// ---------- mentor ----------
const mentor = await contextFor("lo.debarbosa+mentor@gmail.com");
await shot(mentor, "/mentor", "mentor-roster", { full: true });
await shot(mentor, "/mentor/console", "mentor-console", { full: true });
await shot(mentor, "/mentor/0855d5be-c6c0-4ea3-8d5f-68c26eab22b1", "mentor-ficha", { full: true });
await shot(
  mentor,
  "/mentor/0855d5be-c6c0-4ea3-8d5f-68c26eab22b1?tab=diagnostico",
  "mentor-ficha-diagnostico"
);
await mentor.close();

await browser.close();
console.log("pronto");
