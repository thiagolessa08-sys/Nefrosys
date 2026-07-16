import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { salvarArquivo, removerArquivo } from "@/lib/arquivos/armazenamento";
import { validarArquivo, extensaoDeMime } from "@/lib/arquivos/tipos";
import type { CategoriaDocumento, Documento } from "@prisma/client";

export type ResultadoDocumento = { ok: true; id: string } | { ok: false; erro: string };

export async function anexarDocumento(
  dados: {
    pacienteId: string;
    categoria: CategoriaDocumento;
    nomeOriginal: string;
    tipoMime: string;
    conteudo: Buffer;
  },
  autorId: string,
): Promise<ResultadoDocumento> {
  const erro = validarArquivo(dados.tipoMime, dados.conteudo.length);
  if (erro) return { ok: false, erro };

  const extensao = extensaoDeMime(dados.tipoMime)!;
  const chave = await salvarArquivo(dados.conteudo, extensao);

  const doc = await db.documento.create({
    data: {
      pacienteId: dados.pacienteId,
      categoria: dados.categoria,
      nomeOriginal: dados.nomeOriginal.trim() || `arquivo${extensao}`,
      chaveArmazenamento: chave,
      tipoMime: dados.tipoMime,
      tamanhoBytes: dados.conteudo.length,
      autorId,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.documento.anexar",
    entidade: "Documento",
    entidadeId: doc.id,
    detalhes: { pacienteId: dados.pacienteId, categoria: dados.categoria },
  });
  return { ok: true, id: doc.id };
}

export function listarDocumentos(pacienteId: string): Promise<Documento[]> {
  return db.documento.findMany({ where: { pacienteId }, orderBy: { criadoEm: "desc" } });
}

export async function removerDocumento(documentoId: string, autorId: string): Promise<ResultadoDocumento> {
  const doc = await db.documento.findUnique({ where: { id: documentoId } });
  if (!doc) return { ok: false, erro: "Documento não encontrado." };

  // se for a foto atual do paciente, desvincula antes
  await db.paciente.updateMany({
    where: { id: doc.pacienteId, fotoDocumentoId: documentoId },
    data: { fotoDocumentoId: null },
  });
  await db.documento.delete({ where: { id: documentoId } });
  await removerArquivo(doc.chaveArmazenamento).catch(() => {}); // metadado já foi; arquivo é best-effort
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.documento.remover",
    entidade: "Documento",
    entidadeId: documentoId,
    detalhes: { pacienteId: doc.pacienteId },
  });
  return { ok: true, id: documentoId };
}

export async function definirFoto(pacienteId: string, documentoId: string, autorId: string): Promise<ResultadoDocumento> {
  const doc = await db.documento.findUnique({ where: { id: documentoId } });
  if (!doc || doc.pacienteId !== pacienteId) return { ok: false, erro: "Documento inválido." };
  if (doc.categoria !== "FOTO") return { ok: false, erro: "O documento não é uma foto." };

  await db.paciente.update({ where: { id: pacienteId }, data: { fotoDocumentoId: documentoId } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.foto.definir",
    entidade: "Paciente",
    entidadeId: pacienteId,
  });
  return { ok: true, id: documentoId };
}
