import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { chunkText } from "@/lib/knowledge/chunking";
import { embedChunks } from "@/lib/knowledge/embeddings";

const TIPOS = ["playbook", "framework", "transcricao", "bibliografia", "caso"] as const;
const PILARES = ["BUSINESS", "VALUE", "PEOPLE", "COMMUNICATION", "CAREER"] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Corpus é IP do produto — mesma allowlist de /api/mentor/validate, sem
  // tabela de papel própria (admin e mentor são a mesma pessoa por ora).
  if (!user || !isMentor(user.email)) {
    return new Response("Não autorizado.", { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const titulo = body?.titulo;
  const tipo = body?.tipo;
  const pilar = body?.pilar ?? null;
  const etapas = body?.etapas;
  const visibilidade = body?.visibilidade === "mentor" ? "mentor" : "turma";
  const conteudo = body?.conteudo;

  if (typeof titulo !== "string" || !titulo.trim()) {
    return new Response("titulo é obrigatório.", { status: 400 });
  }
  if (!TIPOS.includes(tipo)) {
    return new Response(`tipo deve ser um de: ${TIPOS.join(", ")}.`, { status: 400 });
  }
  if (pilar !== null && !PILARES.includes(pilar)) {
    return new Response(`pilar deve ser um de: ${PILARES.join(", ")}.`, { status: 400 });
  }
  if (typeof conteudo !== "string" || !conteudo.trim()) {
    return new Response("conteudo é obrigatório.", { status: 400 });
  }

  const chunks = chunkText(conteudo);
  if (chunks.length === 0) {
    return new Response("conteudo não gerou nenhum chunk.", { status: 400 });
  }

  const admin = createAdminClient();

  const { data: document, error: documentError } = await admin
    .from("knowledge_documents")
    .insert({
      titulo,
      tipo,
      pilar,
      etapas: Array.isArray(etapas) ? etapas : null,
      visibilidade,
      conteudo,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    console.error("ingest: falha ao criar knowledge_document", documentError);
    return new Response("Falha ao criar documento.", { status: 500 });
  }

  let embeddings: number[][];
  try {
    embeddings = await embedChunks(chunks);
  } catch (error) {
    console.error("ingest: falha ao gerar embeddings", error);
    await admin.from("knowledge_documents").delete().eq("id", document.id);
    return new Response("Falha ao gerar embeddings.", { status: 502 });
  }

  const rows = chunks.map((conteudoChunk, index) => ({
    document_id: document.id,
    ordem: index,
    conteudo: conteudoChunk,
    embedding: embeddings[index],
  }));

  const { error: chunksError } = await admin.from("knowledge_chunks").insert(rows);

  if (chunksError) {
    console.error("ingest: falha ao gravar chunks", chunksError);
    await admin.from("knowledge_documents").delete().eq("id", document.id);
    return new Response("Falha ao gravar chunks.", { status: 500 });
  }

  return Response.json({ ok: true, documentId: document.id, chunks: rows.length });
}
