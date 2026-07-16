import { describe, it, expect, beforeEach } from "vitest";
import { registrarSorologia, sorologiasAtuais } from "@/lib/pacientes/sorologias";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function pacienteEautor() {
  const autor = await criarUsuarioTeste({ perfil: "ENFERMAGEM", email: "e@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou");
  return { autor, pacienteId: criado.id };
}

describe("sorologias", () => {
  beforeEach(limparBanco);

  it("registra sorologia e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await registrarSorologia(
      { pacienteId, tipo: "HBSAG", resultado: "NEGATIVO", dataExame: new Date("2024-01-15") },
      autor.id,
    );
    expect(r.ok).toBe(true);
  });

  it("sorologiasAtuais devolve o resultado mais recente de cada tipo", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    await registrarSorologia({ pacienteId, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2023-01-01") }, autor.id);
    await registrarSorologia({ pacienteId, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2024-06-01") }, autor.id);
    await registrarSorologia({ pacienteId, tipo: "HIV", resultado: "NEGATIVO", dataExame: new Date("2024-06-01") }, autor.id);

    const atuais = await sorologiasAtuais(pacienteId);
    expect(atuais.ANTI_HCV?.resultado).toBe("POSITIVO"); // o mais recente vence
    expect(atuais.HIV?.resultado).toBe("NEGATIVO");
    expect(atuais.HBSAG).toBeUndefined(); // nunca registrada
  });
});
