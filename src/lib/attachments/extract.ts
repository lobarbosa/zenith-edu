import mammoth from "mammoth";

// SPEC-AGENTS.md §12: PDF e imagem entram como bloco nativo de documento/
// imagem do modelo; DOCX e CSV são convertidos para texto no servidor — o
// modelo nunca recebe o binário desses formatos. Todo bloco resultante é
// tratado como dado, nunca instrução (regra da §3, prompt base).
export type NativeBlock =
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg"; data: string } };

export type ExtractedAttachment =
  | { kind: "native"; block: NativeBlock }
  | { kind: "text"; text: string };

export async function extractAttachment(
  tipoMime: string,
  bytes: Buffer
): Promise<ExtractedAttachment> {
  if (tipoMime === "application/pdf") {
    return {
      kind: "native",
      block: {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") },
      },
    };
  }

  if (tipoMime === "image/png" || tipoMime === "image/jpeg") {
    return {
      kind: "native",
      block: {
        type: "image",
        source: { type: "base64", media_type: tipoMime, data: bytes.toString("base64") },
      },
    };
  }

  if (tipoMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return { kind: "text", text: result.value };
  }

  // CSV: já é texto puro, passa direto.
  return { kind: "text", text: bytes.toString("utf-8") };
}
