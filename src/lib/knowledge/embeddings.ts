// Embedding do corpus via Voyage AI (parceiro de embeddings da Anthropic).
// voyage-3-lite gera 1024 dimensões nativamente — bate com o vector(1024)
// de knowledge_chunks (SPEC-SOFTWARE.md §6). Só chame a partir de rota de
// servidor: VOYAGE_API_KEY nunca pode chegar a um client component.
const VOYAGE_MODEL = "voyage-3-lite";
const BATCH_SIZE = 100;

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    embeddings.push(...(await embedBatch(batch, "document")));
  }
  return embeddings;
}

// Voyage distingue o embedding de documento (indexação) do de query (busca)
// pra otimizar a similaridade entre os dois — mesmo texto, `input_type`
// diferente.
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text], "query");
  return embedding;
}

async function embedBatch(batch: string[], inputType: "document" | "query"): Promise<number[][]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      input: batch,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage embeddings falhou: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return (data.data as { index: number; embedding: number[] }[])
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
