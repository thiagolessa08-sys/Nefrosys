import { describe, it, expect } from "vitest";
import { perfilPermitido, rotuloPerfil } from "@/lib/perfis";

describe("perfis", () => {
  it("autoriza perfil presente na lista", () => {
    expect(perfilPermitido("MEDICO", ["MEDICO", "ENFERMAGEM"])).toBe(true);
  });

  it("nega perfil ausente da lista", () => {
    expect(perfilPermitido("RECEPCAO", ["MEDICO", "ENFERMAGEM"])).toBe(false);
  });

  it("tem rótulo em português para todos os perfis", () => {
    const perfis = ["ADMINISTRADOR", "MEDICO", "ENFERMAGEM", "TECNICO", "RECEPCAO", "MULTIPROFISSIONAL"] as const;
    for (const perfil of perfis) expect(rotuloPerfil[perfil]).toBeTruthy();
  });
});
