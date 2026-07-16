import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

function baseDir(): string {
  return process.env.DIRETORIO_ARQUIVOS ?? path.join(process.cwd(), "uploads");
}

// Resolve a chave para um caminho DENTRO do baseDir; recusa qualquer tentativa de escapar.
function caminhoSeguro(chave: string): string {
  const base = path.resolve(baseDir());
  const alvo = path.resolve(base, chave);
  if (alvo !== base && !alvo.startsWith(base + path.sep)) {
    throw new Error("Chave de arquivo inválida.");
  }
  return alvo;
}

export async function salvarArquivo(conteudo: Buffer, extensao: string): Promise<string> {
  const chave = `${randomUUID()}${extensao}`;
  const alvo = caminhoSeguro(chave);
  await mkdir(path.dirname(alvo), { recursive: true });
  await writeFile(alvo, conteudo);
  return chave;
}

export async function lerArquivo(chave: string): Promise<Buffer> {
  return readFile(caminhoSeguro(chave));
}

export async function removerArquivo(chave: string): Promise<void> {
  await unlink(caminhoSeguro(chave));
}
