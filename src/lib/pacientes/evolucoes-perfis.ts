import type { Perfil, TipoEvolucao } from "@prisma/client";

const TIPOS_POR_PERFIL: Record<Perfil, TipoEvolucao[]> = {
  MEDICO: ["MEDICA"],
  ENFERMAGEM: ["ENFERMAGEM"],
  MULTIPROFISSIONAL: ["NUTRICAO", "PSICOLOGIA", "SERVICO_SOCIAL"],
  TECNICO: [],
  RECEPCAO: [],
  ADMINISTRADOR: [],
};

export function tiposPermitidos(perfil: Perfil): TipoEvolucao[] {
  return TIPOS_POR_PERFIL[perfil];
}

export function podeEvoluir(perfil: Perfil): boolean {
  return TIPOS_POR_PERFIL[perfil].length > 0;
}
