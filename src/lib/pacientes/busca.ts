import { db } from "@/lib/db";
import { apenasDigitos } from "./documentos";
import type {
  Modalidade, Paciente, Prisma, SituacaoPaciente, TipoVinculo, TipoSorologia, TipoAcesso,
} from "@prisma/client";

export type FiltrosPaciente = {
  texto?: string;
  situacao?: SituacaoPaciente;
  modalidade?: Modalidade;
  tipoVinculo?: TipoVinculo;
  sorologiaPositiva?: TipoSorologia;
  tipoAcesso?: TipoAcesso;
};

export async function buscarPacientes(filtros: FiltrosPaciente): Promise<Paciente[]> {
  const condicoes: Prisma.PacienteWhereInput[] = [];

  const texto = filtros.texto?.trim();
  if (texto) {
    const digitos = apenasDigitos(texto);
    const alternativas: Prisma.PacienteWhereInput[] = [
      { nome: { contains: texto, mode: "insensitive" } },
    ];
    // só busca por documento quando o usuário digitou números
    if (digitos) {
      alternativas.push({ cpf: { contains: digitos } });
      alternativas.push({ cns: { contains: digitos } });
    }
    condicoes.push({ OR: alternativas });
  }

  if (filtros.situacao) condicoes.push({ situacao: filtros.situacao });
  if (filtros.modalidade) condicoes.push({ modalidade: filtros.modalidade });
  if (filtros.tipoVinculo) condicoes.push({ tipoVinculo: filtros.tipoVinculo });

  if (filtros.sorologiaPositiva) {
    const ultimas = await db.sorologia.findMany({
      where: { tipo: filtros.sorologiaPositiva },
      orderBy: { dataExame: "desc" },
    });
    const maisRecentePorPaciente = new Map<string, string>(); // pacienteId -> resultado
    for (const s of ultimas) {
      if (!maisRecentePorPaciente.has(s.pacienteId)) maisRecentePorPaciente.set(s.pacienteId, s.resultado);
    }
    const positivos = [...maisRecentePorPaciente.entries()]
      .filter(([, resultado]) => resultado === "POSITIVO")
      .map(([pacienteId]) => pacienteId);
    condicoes.push({ id: { in: positivos } });
  }

  if (filtros.tipoAcesso) {
    const comAcesso = await db.acessoVascular.findMany({
      where: { tipo: filtros.tipoAcesso, situacao: "EM_USO" },
      select: { pacienteId: true },
    });
    condicoes.push({ id: { in: comAcesso.map((a) => a.pacienteId) } });
  }

  return db.paciente.findMany({
    where: condicoes.length ? { AND: condicoes } : undefined,
    orderBy: { nome: "asc" },
    take: 200,
  });
}
