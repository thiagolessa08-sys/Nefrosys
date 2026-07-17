import type { Perfil } from "@prisma/client";

export const rotuloPerfil: Record<Perfil, string> = {
  ADMINISTRADOR: "Administrador",
  MEDICO: "Médico",
  ENFERMAGEM: "Enfermagem",
  TECNICO: "Técnico",
  RECEPCAO: "Recepção",
  MULTIPROFISSIONAL: "Multiprofissional",
  DIRETOR: "Diretor",
};

// Perfis com acesso às áreas de gestão (usuários e auditoria).
// DIRETOR é o superusuário do dono da clínica: vê gestão E conteúdo clínico.
export const PERFIS_GESTAO: readonly Perfil[] = ["ADMINISTRADOR", "DIRETOR"];

export function perfilPermitido(perfil: Perfil, permitidos: readonly Perfil[]): boolean {
  return permitidos.includes(perfil);
}
