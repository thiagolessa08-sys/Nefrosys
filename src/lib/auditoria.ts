import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// A trilha é somente-acréscimo: este módulo não expõe atualização nem exclusão.
export async function registrarEvento(dados: {
  usuarioId: string | null;
  acao: string;
  entidade?: string;
  entidadeId?: string;
  detalhes?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.eventoAuditoria.create({
    data: {
      usuarioId: dados.usuarioId,
      acao: dados.acao,
      entidade: dados.entidade,
      entidadeId: dados.entidadeId,
      detalhes: dados.detalhes,
    },
  });
}
