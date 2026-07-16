import { formatarCpf } from "./documentos";
import type { Modalidade, Paciente, SituacaoPaciente } from "@prisma/client";

export const CABECALHO_EXCEL = ["Nome", "CPF", "Nascimento", "Modalidade", "Vínculo", "Situação"];

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo",
  TRANSPLANTADO: "Transplantado",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EM_TRANSITO: "Em trânsito",
};

const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise",
  DIALISE_PERITONEAL: "Diálise peritoneal",
};

function dataUTC(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function linhasParaExcel(pacientes: Paciente[]): string[][] {
  return pacientes.map((p) => [
    p.nome,
    formatarCpf(p.cpf),
    dataUTC(p.dataNascimento),
    p.modalidade ? ROTULO_MODALIDADE[p.modalidade] : "—",
    p.tipoVinculo === "SUS" ? "SUS" : p.convenioNome ?? "Convênio",
    ROTULO_SITUACAO[p.situacao],
  ]);
}
