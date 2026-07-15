import { db } from "@/lib/db";
import { apenasDigitos } from "./documentos";
import type { Modalidade, Paciente, Prisma, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export type FiltrosPaciente = {
  texto?: string;
  situacao?: SituacaoPaciente;
  modalidade?: Modalidade;
  tipoVinculo?: TipoVinculo;
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

  return db.paciente.findMany({
    where: condicoes.length ? { AND: condicoes } : undefined,
    orderBy: { nome: "asc" },
    take: 200,
  });
}
