// Chunking do corpus (SPEC-SOFTWARE.md §9: ~800 tokens, sobreposição de
// ~100). Sem tokenizer no projeto — aproxima por palavra (1 token ~= 0.75
// palavra em português), o suficiente pra um chunk de tamanho consistente.
const WORDS_PER_CHUNK = 600;
const WORDS_OVERLAP = 75;

export function chunkText(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - WORDS_OVERLAP;
  }
  return chunks;
}
