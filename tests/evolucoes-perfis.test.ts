import { describe, it, expect } from "vitest";
import { tiposPermitidos, podeEvoluir } from "@/lib/pacientes/evolucoes-perfis";

describe("tipos de evolução por perfil", () => {
  it("médico registra só evolução médica", () => {
    expect(tiposPermitidos("MEDICO")).toEqual(["MEDICA"]);
  });

  it("enfermagem registra só evolução de enfermagem", () => {
    expect(tiposPermitidos("ENFERMAGEM")).toEqual(["ENFERMAGEM"]);
  });

  it("multiprofissional registra nutrição, psicologia e serviço social", () => {
    expect(tiposPermitidos("MULTIPROFISSIONAL")).toEqual(["NUTRICAO", "PSICOLOGIA", "SERVICO_SOCIAL"]);
  });

  it("recepção, técnico e administrador não evoluem", () => {
    for (const perfil of ["RECEPCAO", "TECNICO", "ADMINISTRADOR"] as const) {
      expect(tiposPermitidos(perfil)).toEqual([]);
      expect(podeEvoluir(perfil)).toBe(false);
    }
  });

  it("podeEvoluir é true para quem tem ao menos um tipo", () => {
    expect(podeEvoluir("MEDICO")).toBe(true);
    expect(podeEvoluir("MULTIPROFISSIONAL")).toBe(true);
  });
});
