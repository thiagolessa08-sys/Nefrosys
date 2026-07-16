import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { TEMPLATE_POR_TIPO } from "./evolucoes-templates";
import type { Adendo, Evolucao, TipoEvolucao } from "@prisma/client";

export type ResultadoEvolucao = { ok: true; id: string } | { ok: false; erro: string };
export type EvolucaoComAdendos = Evolucao & { adendos: Adendo[] };

// Reusa o rascunho aberto (não assinado) do autor para aquele tipo; senão cria um com o template.
export async function abrirRascunho(
  pacienteId: string,
  tipo: TipoEvolucao,
  autorId: string,
): Promise<ResultadoEvolucao> {
  const existente = await db.evolucao.findFirst({
    where: { pacienteId, tipo, autorId, assinadaEm: null },
  });
  if (existente) return { ok: true, id: existente.id };

  const evolucao = await db.evolucao.create({
    data: { pacienteId, tipo, autorId, texto: TEMPLATE_POR_TIPO[tipo] },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.evolucao.abrir_rascunho",
    entidade: "Evolucao",
    entidadeId: evolucao.id,
    detalhes: { pacienteId, tipo },
  });
  return { ok: true, id: evolucao.id };
}

export async function salvarRascunho(
  evolucaoId: string,
  texto: string,
  autorId: string,
): Promise<ResultadoEvolucao> {
  const ev = await db.evolucao.findUnique({ where: { id: evolucaoId } });
  if (!ev) return { ok: false, erro: "Evolução não encontrada." };
  if (ev.autorId !== autorId) return { ok: false, erro: "Você só pode editar seus próprios rascunhos." };
  if (ev.assinadaEm) return { ok: false, erro: "Evolução assinada não pode ser editada." };

  await db.evolucao.update({ where: { id: evolucaoId }, data: { texto } });
  return { ok: true, id: evolucaoId };
}

export async function assinarEvolucao(evolucaoId: string, autorId: string): Promise<ResultadoEvolucao> {
  const ev = await db.evolucao.findUnique({ where: { id: evolucaoId } });
  if (!ev) return { ok: false, erro: "Evolução não encontrada." };
  if (ev.autorId !== autorId) return { ok: false, erro: "Você só pode assinar suas próprias evoluções." };
  if (ev.assinadaEm) return { ok: false, erro: "Evolução já está assinada." };
  if (!ev.texto.trim()) return { ok: false, erro: "A evolução está vazia." };

  await db.evolucao.update({ where: { id: evolucaoId }, data: { assinadaEm: new Date() } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.evolucao.assinar",
    entidade: "Evolucao",
    entidadeId: evolucaoId,
    detalhes: { pacienteId: ev.pacienteId, tipo: ev.tipo },
  });
  return { ok: true, id: evolucaoId };
}

export async function adicionarAdendo(
  evolucaoId: string,
  texto: string,
  autorId: string,
): Promise<ResultadoEvolucao> {
  if (!texto.trim()) return { ok: false, erro: "O adendo está vazio." };
  const ev = await db.evolucao.findUnique({ where: { id: evolucaoId } });
  if (!ev) return { ok: false, erro: "Evolução não encontrada." };
  if (!ev.assinadaEm) return { ok: false, erro: "Só evolução assinada aceita adendo." };

  const adendo = await db.adendo.create({ data: { evolucaoId, autorId, texto: texto.trim() } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.evolucao.adendo",
    entidade: "Adendo",
    entidadeId: adendo.id,
    detalhes: { evolucaoId, pacienteId: ev.pacienteId },
  });
  return { ok: true, id: adendo.id };
}

export function listarEvolucoes(pacienteId: string): Promise<EvolucaoComAdendos[]> {
  return db.evolucao.findMany({
    where: { pacienteId, assinadaEm: { not: null } },
    orderBy: { assinadaEm: "desc" },
    include: { adendos: { orderBy: { criadoEm: "asc" } } },
  });
}
