import type { Perfil } from "@prisma/client";

// Administrador fica de fora de propósito: o spec separa gestão de assistência.
// DIRETOR (superusuário do dono) é a exceção: vê tudo, inclusive pacientes.
export const PERFIS_LEITURA_PACIENTE: readonly Perfil[] = [
  "RECEPCAO",
  "MEDICO",
  "ENFERMAGEM",
  "TECNICO",
  "MULTIPROFISSIONAL",
  "DIRETOR",
];

export const PERFIS_CADASTRO_PACIENTE: readonly Perfil[] = ["RECEPCAO", "MEDICO", "ENFERMAGEM"];

export const PERFIS_CLINICO_PACIENTE: readonly Perfil[] = ["MEDICO", "ENFERMAGEM"];

// Quem pode VER conteúdo clínico. Recepção vê só identificação/vínculo (spec 4.1).
// DIRETOR (superusuário) também vê o clínico.
export const PERFIS_CLINICO_LEITURA: readonly Perfil[] = [
  "MEDICO",
  "ENFERMAGEM",
  "TECNICO",
  "MULTIPROFISSIONAL",
  "DIRETOR",
];
