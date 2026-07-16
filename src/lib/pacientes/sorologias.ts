import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import type { Sorologia, TipoSorologia, ResultadoSorologia } from "@prisma/client";

export type ResultadoSorologiaOp = { ok: true; id: string } | { ok: false; erro: string };

export async function registrarSorologia(
  dados: { pacienteId: string; tipo: TipoSorologia; resultado: ResultadoSorologia; dataExame: Date },
  autorId: string,
): Promise<ResultadoSorologiaOp> {
  const sorologia = await db.sorologia.create({
    data: {
      pacienteId: dados.pacienteId,
      tipo: dados.tipo,
      resultado: dados.resultado,
      dataExame: dados.dataExame,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.sorologia.registrar",
    entidade: "Sorologia",
    entidadeId: sorologia.id,
    detalhes: { pacienteId: dados.pacienteId, tipo: dados.tipo, resultado: dados.resultado },
  });
  return { ok: true, id: sorologia.id };
}

// Devolve, por tipo, a sorologia mais recente (por data do exame). Chave = TipoSorologia.
export async function sorologiasAtuais(
  pacienteId: string,
): Promise<Partial<Record<TipoSorologia, Sorologia>>> {
  const todas = await db.sorologia.findMany({
    where: { pacienteId },
    orderBy: { dataExame: "desc" },
  });
  const atuais: Partial<Record<TipoSorologia, Sorologia>> = {};
  for (const s of todas) {
    if (!atuais[s.tipo]) atuais[s.tipo] = s; // a primeira de cada tipo é a mais recente
  }
  return atuais;
}
