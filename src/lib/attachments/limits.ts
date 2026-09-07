// SPEC-AGENTS.md §12: formatos aceitos, tamanho máximo e limite por
// mensagem. XLSX ficou de fora desta entrega — o pacote xlsx (SheetJS) do
// npm tem vulnerabilidade alta sem correção no parser (ver commit da
// dependência mammoth), e alternativas ficaram pra revisitar depois.
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/csv": "CSV",
  "image/png": "PNG",
  "image/jpeg": "JPG",
};

export const ALLOWED_MIME_LABEL = "PDF, DOCX, CSV, PNG ou JPG";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_MESSAGE = 3;

export const ATTACHMENTS_BUCKET = "attachments";
