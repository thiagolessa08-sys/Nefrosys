import { describe, it, expect } from "vitest";
import {
  PERFIS_LEITURA_PACIENTE,
  PERFIS_CADASTRO_PACIENTE,
  PERFIS_CLINICO_PACIENTE,
} from "@/lib/pacientes/permissoes";

describe("permissoes de paciente", () => {
  it("administrador não acessa paciente em nenhuma lista", () => {
    expect(PERFIS_LEITURA_PACIENTE).not.toContain("ADMINISTRADOR");
    expect(PERFIS_CADASTRO_PACIENTE).not.toContain("ADMINISTRADOR");
    expect(PERFIS_CLINICO_PACIENTE).not.toContain("ADMINISTRADOR");
  });

  it("recepção lê e cadastra, mas não edita dado clínico", () => {
    expect(PERFIS_LEITURA_PACIENTE).toContain("RECEPCAO");
    expect(PERFIS_CADASTRO_PACIENTE).toContain("RECEPCAO");
    expect(PERFIS_CLINICO_PACIENTE).not.toContain("RECEPCAO");
  });

  it("técnico e multiprofissional só leem", () => {
    for (const perfil of ["TECNICO", "MULTIPROFISSIONAL"] as const) {
      expect(PERFIS_LEITURA_PACIENTE).toContain(perfil);
      expect(PERFIS_CADASTRO_PACIENTE).not.toContain(perfil);
      expect(PERFIS_CLINICO_PACIENTE).not.toContain(perfil);
    }
  });

  it("médico e enfermagem fazem tudo", () => {
    for (const perfil of ["MEDICO", "ENFERMAGEM"] as const) {
      expect(PERFIS_LEITURA_PACIENTE).toContain(perfil);
      expect(PERFIS_CADASTRO_PACIENTE).toContain(perfil);
      expect(PERFIS_CLINICO_PACIENTE).toContain(perfil);
    }
  });

  it("leitura clínica exclui recepção e administrador, inclui os demais", async () => {
    const { PERFIS_CLINICO_LEITURA } = await import("@/lib/pacientes/permissoes");
    expect(PERFIS_CLINICO_LEITURA).not.toContain("ADMINISTRADOR");
    expect(PERFIS_CLINICO_LEITURA).not.toContain("RECEPCAO");
    for (const perfil of ["MEDICO", "ENFERMAGEM", "TECNICO", "MULTIPROFISSIONAL"] as const) {
      expect(PERFIS_CLINICO_LEITURA).toContain(perfil);
    }
  });
});
