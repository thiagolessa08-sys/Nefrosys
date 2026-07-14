import type { Perfil } from "@prisma/client";

export const rotuloPerfil: Record<Perfil, string> = {
  ADMINISTRADOR: "Administrador",
  MEDICO: "Médico",
  ENFERMAGEM: "Enfermagem",
  TECNICO: "Técnico",
  RECEPCAO: "Recepção",
  MULTIPROFISSIONAL: "Multiprofissional",
};

export function perfilPermitido(perfil: Perfil, permitidos: readonly Perfil[]): boolean {
  return permitidos.includes(perfil);
}
