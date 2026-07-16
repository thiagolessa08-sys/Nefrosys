import { db } from "@/lib/db";
import { sorologiasAtuais } from "./sorologias";
import { medicacoesAtivas, listarAlergias } from "./medicacoes";
import type { AcessoVascular, Alergia, Medicacao, Paciente, Sorologia, TipoSorologia } from "@prisma/client";

export type Resumo = {
  paciente: Paciente;
  acessoAtual: AcessoVascular | null;
  sorologias: Partial<Record<TipoSorologia, Sorologia>>;
  medicacoesAtivas: Medicacao[];
  alergias: Alergia[];
};

export async function montarResumo(pacienteId: string): Promise<Resumo | null> {
  const paciente = await db.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) return null;

  const acessoAtual = await db.acessoVascular.findFirst({
    where: { pacienteId, situacao: "EM_USO" },
    orderBy: { dataConfeccao: "desc" },
  });

  const [sorologias, ativas, alergias] = await Promise.all([
    sorologiasAtuais(pacienteId),
    medicacoesAtivas(pacienteId),
    listarAlergias(pacienteId),
  ]);

  return { paciente, acessoAtual, sorologias, medicacoesAtivas: ativas, alergias };
}
