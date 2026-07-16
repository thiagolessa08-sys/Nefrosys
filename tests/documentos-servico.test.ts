import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { anexarDocumento, listarDocumentos, removerDocumento, definirFoto } from "@/lib/pacientes/documentos-servico";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "nefrosys-doc-"));
  process.env.DIRETORIO_ARQUIVOS = dir;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

async function cenario() {
  const autor = await criarUsuarioTeste({ perfil: "ENFERMAGEM", email: "enf@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou");
  return { autor, pacienteId: criado.id };
}

describe("serviço de documentos", () => {
  beforeEach(limparBanco);

  it("anexa documento válido, grava metadados e audita", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "LAUDO", nomeOriginal: "laudo.pdf", tipoMime: "application/pdf",
        conteudo: Buffer.from("PDF fake") },
      autor.id,
    );
    expect(r.ok).toBe(true);
    const docs = await listarDocumentos(pacienteId);
    expect(docs).toHaveLength(1);
    expect(docs[0].nomeOriginal).toBe("laudo.pdf");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.documento.anexar" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita tipo não permitido", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "OUTRO", nomeOriginal: "x.zip", tipoMime: "application/zip",
        conteudo: Buffer.from("zip") },
      autor.id,
    );
    expect(r).toEqual({ ok: false, erro: "Tipo de arquivo não permitido (use PDF ou imagem)." });
    expect(await listarDocumentos(pacienteId)).toHaveLength(0);
  });

  it("remover apaga metadados e arquivo, e audita", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "TERMO", nomeOriginal: "termo.pdf", tipoMime: "application/pdf",
        conteudo: Buffer.from("PDF") },
      autor.id,
    );
    if (!r.ok) throw new Error("falhou");
    const res = await removerDocumento(r.id, autor.id);
    expect(res.ok).toBe(true);
    expect(await listarDocumentos(pacienteId)).toHaveLength(0);
  });

  it("definir foto aponta o paciente para o documento de foto", async () => {
    const { autor, pacienteId } = await cenario();
    const r = await anexarDocumento(
      { pacienteId, categoria: "FOTO", nomeOriginal: "foto.jpg", tipoMime: "image/jpeg",
        conteudo: Buffer.from("JPG") },
      autor.id,
    );
    if (!r.ok) throw new Error("falhou");
    await definirFoto(pacienteId, r.id, autor.id);
    const paciente = await db.paciente.findUnique({ where: { id: pacienteId } });
    expect(paciente?.fotoDocumentoId).toBe(r.id);
  });
});
