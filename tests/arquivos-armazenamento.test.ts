import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { salvarArquivo, lerArquivo, removerArquivo } from "@/lib/arquivos/armazenamento";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "nefrosys-arq-"));
  process.env.DIRETORIO_ARQUIVOS = dir;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("armazenamento de arquivos", () => {
  it("salva e lê de volta o mesmo conteúdo", async () => {
    const conteudo = Buffer.from("conteúdo de teste");
    const chave = await salvarArquivo(conteudo, ".pdf");
    expect(chave.endsWith(".pdf")).toBe(true);
    const lido = await lerArquivo(chave);
    expect(lido.equals(conteudo)).toBe(true);
  });

  it("gera chaves diferentes a cada salvamento", async () => {
    const a = await salvarArquivo(Buffer.from("a"), ".png");
    const b = await salvarArquivo(Buffer.from("b"), ".png");
    expect(a).not.toBe(b);
  });

  it("remove o arquivo", async () => {
    const chave = await salvarArquivo(Buffer.from("x"), ".pdf");
    await removerArquivo(chave);
    await expect(lerArquivo(chave)).rejects.toThrow();
  });

  it("não deixa escapar do diretório base (path traversal)", async () => {
    await expect(lerArquivo("../../etc/passwd")).rejects.toThrow();
  });
});
