// Carrega supabase/seed/playbooks/*.txt no corpus (knowledge_documents +
// knowledge_chunks) direto via service_role — sem passar por
// /api/knowledge/ingest, porque essa rota exige sessão de mentor
// autenticada e ainda não existe UI (/admin/conhecimento) pra gerar isso;
// rodar aqui é o operador confiável com a própria service_role key, não um
// usuário da aplicação.
//
// Chunking espelha src/lib/knowledge/chunking.ts (mesmas constantes) e
// embedding espelha src/lib/knowledge/embeddings.ts (mesmo modelo) —
// mantenha os dois em sincronia se um mudar.
//
// Uso: node scripts/ingest-playbooks.js
// Requer no .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// VOYAGE_API_KEY.

const fs = require("fs");
const path = require("path");

// Sem dependência nova só pra isso (CLAUDE.md pede perguntar antes de
// introduzir lib) — .env.local é KEY=VALUE simples, parse manual basta.
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

const SEED_DIR = path.join(__dirname, "..", "supabase", "seed", "playbooks");
const VOYAGE_MODEL = "voyage-3.5";
const EMBED_BATCH_SIZE = 100;
const WORDS_PER_CHUNK = 600;
const WORDS_OVERLAP = 75;

function chunkText(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - WORDS_OVERLAP;
  }
  return chunks;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Conta Voyage sem cartão cadastrado fica em 3 RPM — reintenta com espera
// em vez de exigir cadastro de pagamento só pra ingerir 10 documentos.
async function embedChunks(chunks) {
  const embeddings = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);

    let attempt = 0;
    for (;;) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${VOYAGE_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ input: batch, model: VOYAGE_MODEL, input_type: "document" }),
      });

      if (res.status === 429 && attempt < 5) {
        attempt += 1;
        console.log(`  ⏳ rate limit da Voyage — esperando 25s (tentativa ${attempt}/5)`);
        await sleep(25000);
        continue;
      }
      if (!res.ok) throw new Error(`Voyage falhou: ${res.status} ${await res.text()}`);

      const data = await res.json();
      const sorted = data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
      embeddings.push(...sorted);
      break;
    }
  }
  return embeddings;
}

async function sb(pathSuffix, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathSuffix}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Supabase falhou (${pathSuffix}): ${res.status} ${await res.text()}`);
  return res.json();
}

async function ingestOne(entry) {
  const conteudo = fs.readFileSync(path.join(SEED_DIR, entry.file), "utf-8");
  const chunks = chunkText(conteudo);

  console.log(`  chunking: ${chunks.length} trechos`);
  const embeddings = await embedChunks(chunks);

  const [document] = await sb("knowledge_documents", {
    method: "POST",
    body: JSON.stringify({
      titulo: entry.titulo,
      tipo: entry.tipo,
      pilar: entry.pilar,
      etapas: entry.etapas,
      visibilidade: "turma",
      conteudo,
    }),
  });

  const rows = chunks.map((chunkConteudo, index) => ({
    document_id: document.id,
    ordem: index,
    conteudo: chunkConteudo,
    embedding: embeddings[index],
  }));

  await sb("knowledge_chunks", { method: "POST", body: JSON.stringify(rows) });

  return { documentId: document.id, chunks: rows.length };
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY || !VOYAGE_API_KEY) {
    console.error("Faltam variáveis de ambiente. Confira .env.local.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "manifest.json"), "utf-8"));

  // Idempotência simples: pula título já ingerido, pra poder rodar de novo
  // sem duplicar se falhar no meio.
  const existing = await sb("knowledge_documents?select=titulo");
  const existingTitles = new Set(existing.map((d) => d.titulo));

  let totalChunks = 0;
  for (const entry of manifest) {
    if (existingTitles.has(entry.titulo)) {
      console.log(`⏭️  ${entry.titulo} — já existe, pulando`);
      continue;
    }
    console.log(`📄 ${entry.titulo} (${entry.pilar}, ${entry.etapas.join("/")})`);
    try {
      const result = await ingestOne(entry);
      totalChunks += result.chunks;
      console.log(`  ✅ documento ${result.documentId}, ${result.chunks} chunks`);
    } catch (error) {
      console.error(`  ❌ falhou: ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log(`\nTotal de chunks novos: ${totalChunks}`);
}

main();
