import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import type { Medicacao, Alergia } from "@prisma/client";

export type ResultadoClinico = { ok: true; id: string } | { ok: false; erro: string };

export async function adicionarMedicacao(
  dados: { pacienteId: string; nome: string; dose?: string; posologia?: string },
  autorId: string,
): Promise<ResultadoClinico> {
  if (!dados.nome.trim()) return { ok: false, erro: "Informe o nome da medicação." };

  const medicacao = await db.medicacao.create({
    data: {
      pacienteId: dados.pacienteId,
      nome: dados.nome.trim(),
      dose: dados.dose?.trim() || null,
      posologia: dados.posologia?.trim() || null,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.medicacao.adicionar",
    entidade: "Medicacao",
    entidadeId: medicacao.id,
    detalhes: { pacienteId: dados.pacienteId },
  });
  return { ok: true, id: medicacao.id };
}

export async function suspenderMedicacao(medicacaoId: string, autorId: string): Promise<ResultadoClinico> {
  const medicacao = await db.medicacao.findUnique({ where: { id: medicacaoId } });
  if (!medicacao) return { ok: false, erro: "Medicação não encontrada." };

  await db.medicacao.update({
    where: { id: medicacaoId },
    data: { ativa: false, suspensaEm: new Date() },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.medicacao.suspender",
    entidade: "Medicacao",
    entidadeId: medicacaoId,
    detalhes: { pacienteId: medicacao.pacienteId },
  });
  return { ok: true, id: medicacaoId };
}

export function medicacoesAtivas(pacienteId: string): Promise<Medicacao[]> {
  return db.medicacao.findMany({
    where: { pacienteId, ativa: true },
    orderBy: { nome: "asc" },
  });
}

export async function adicionarAlergia(
  dados: { pacienteId: string; descricao: string },
  autorId: string,
): Promise<ResultadoClinico> {
  if (!dados.descricao.trim()) return { ok: false, erro: "Descreva a alergia." };

  const alergia = await db.alergia.create({
    data: { pacienteId: dados.pacienteId, descricao: dados.descricao.trim() },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.alergia.adicionar",
    entidade: "Alergia",
    entidadeId: alergia.id,
    detalhes: { pacienteId: dados.pacienteId },
  });
  return { ok: true, id: alergia.id };
}

export async function removerAlergia(alergiaId: string, autorId: string): Promise<ResultadoClinico> {
  const alergia = await db.alergia.findUnique({ where: { id: alergiaId } });
  if (!alergia) return { ok: false, erro: "Alergia não encontrada." };

  await db.alergia.delete({ where: { id: alergiaId } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.alergia.remover",
    entidade: "Alergia",
    entidadeId: alergiaId,
    detalhes: { pacienteId: alergia.pacienteId },
  });
  return { ok: true, id: alergiaId };
}

export function listarAlergias(pacienteId: string): Promise<Alergia[]> {
  return db.alergia.findMany({ where: { pacienteId }, orderBy: { criadoEm: "asc" } });
}
