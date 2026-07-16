import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import type { AcessoVascular, TipoAcesso } from "@prisma/client";

export type ResultadoAcesso = { ok: true; id: string } | { ok: false; erro: string };

export async function registrarAcesso(
  dados: { pacienteId: string; tipo: TipoAcesso; localizacao: string; dataConfeccao: Date; observacao?: string },
  autorId: string,
): Promise<ResultadoAcesso> {
  if (!dados.localizacao.trim()) return { ok: false, erro: "Informe a localização do acesso." };

  const acesso = await db.acessoVascular.create({
    data: {
      pacienteId: dados.pacienteId,
      tipo: dados.tipo,
      localizacao: dados.localizacao.trim(),
      dataConfeccao: dados.dataConfeccao,
      observacao: dados.observacao?.trim() || null,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.acesso.registrar",
    entidade: "AcessoVascular",
    entidadeId: acesso.id,
    detalhes: { pacienteId: dados.pacienteId, tipo: dados.tipo },
  });
  return { ok: true, id: acesso.id };
}

export async function marcarAcessoPerdido(acessoId: string, autorId: string): Promise<ResultadoAcesso> {
  const acesso = await db.acessoVascular.findUnique({ where: { id: acessoId } });
  if (!acesso) return { ok: false, erro: "Acesso não encontrado." };

  await db.acessoVascular.update({ where: { id: acessoId }, data: { situacao: "PERDIDO" } });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.acesso.perder",
    entidade: "AcessoVascular",
    entidadeId: acessoId,
    detalhes: { pacienteId: acesso.pacienteId },
  });
  return { ok: true, id: acessoId };
}

export function listarAcessos(pacienteId: string): Promise<AcessoVascular[]> {
  return db.acessoVascular.findMany({
    where: { pacienteId },
    orderBy: { dataConfeccao: "desc" },
  });
}
