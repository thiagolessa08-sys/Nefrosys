import { describe, it, expect } from "vitest";
import { validarArquivo, extensaoDeMime, MAX_BYTES } from "@/lib/arquivos/tipos";

describe("validação de arquivo", () => {
  it("aceita PDF e imagens dentro do limite", () => {
    expect(validarArquivo("application/pdf", 1000)).toBeNull();
    expect(validarArquivo("image/jpeg", 1000)).toBeNull();
    expect(validarArquivo("image/png", 1000)).toBeNull();
    expect(validarArquivo("image/webp", 1000)).toBeNull();
  });

  it("rejeita tipo não permitido", () => {
    expect(validarArquivo("application/zip", 1000)).toBe("Tipo de arquivo não permitido (use PDF ou imagem).");
  });

  it("rejeita arquivo acima do limite", () => {
    expect(validarArquivo("application/pdf", MAX_BYTES + 1)).toBe("Arquivo maior que o limite de 10 MB.");
  });

  it("rejeita arquivo vazio", () => {
    expect(validarArquivo("application/pdf", 0)).toBe("Arquivo vazio.");
  });

  it("mapeia mime para extensão", () => {
    expect(extensaoDeMime("application/pdf")).toBe(".pdf");
    expect(extensaoDeMime("image/jpeg")).toBe(".jpg");
    expect(extensaoDeMime("image/png")).toBe(".png");
    expect(extensaoDeMime("image/webp")).toBe(".webp");
  });
});
