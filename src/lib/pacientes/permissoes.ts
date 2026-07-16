import type { Perfil } from "@prisma/client";

// Administrador fica de fora de propósito: o spec separa gestão de assistência.
export const PERFIS_LEITURA_PACIENTE: readonly Perfil[] = [
  "RECEPCAO",
  "MEDICO",
  "ENFERMAGEM",
  "TECNICO",
  "MULTIPROFISSIONAL",
];

export const PERFIS_CADASTRO_PACIENTE: readonly Perfil[] = ["RECEPCAO", "MEDICO", "ENFERMAGEM"];

export const PERFIS_CLINICO_PACIENTE: readonly Perfil[] = ["MEDICO", "ENFERMAGEM"];

// Quem pode VER conteúdo clínico. Recepção vê só identificação/vínculo (spec 4.1).
export const PERFIS_CLINICO_LEITURA: readonly Perfil[] = [
  "MEDICO",
  "ENFERMAGEM",
  "TECNICO",
  "MULTIPROFISSIONAL",
];
