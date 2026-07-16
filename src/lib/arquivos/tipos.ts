export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_EXTENSAO: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function extensaoDeMime(mime: string): string | null {
  return MIME_EXTENSAO[mime] ?? null;
}

// Retorna null se válido, ou a mensagem de erro.
export function validarArquivo(mime: string, tamanhoBytes: number): string | null {
  if (tamanhoBytes <= 0) return "Arquivo vazio.";
  if (tamanhoBytes > MAX_BYTES) return "Arquivo maior que o limite de 10 MB.";
  if (!extensaoDeMime(mime)) return "Tipo de arquivo não permitido (use PDF ou imagem).";
  return null;
}
