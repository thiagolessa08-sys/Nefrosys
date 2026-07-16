import { describe, it, expect, beforeEach } from "vitest";
import { registrarAcesso, marcarAcessoPerdido, listarAcessos } from "@/lib/pacientes/acessos";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function pacienteEautor() {
  const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou ao criar paciente");
  return { autor, pacienteId: criado.id };
}

describe("acessos vasculares", () => {
  beforeEach(limparBanco);

  it("registra acesso em uso e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await registrarAcesso(
      { pacienteId, tipo: "FISTULA", localizacao: "MSE radiocefálica", dataConfeccao: new Date("2020-01-10") },
      autor.id,
    );
    expect(r.ok).toBe(true);
    const acessos = await listarAcessos(pacienteId);
    expect(acessos).toHaveLength(1);
    expect(acessos[0].situacao).toBe("EM_USO");
  });

  it("rejeita localização vazia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await registrarAcesso(
      { pacienteId, tipo: "CATETER", localizacao: "  ", dataConfeccao: new Date("2021-05-01") },
      autor.id,
    );
    expect(r).toEqual({ ok: false, erro: "Informe a localização do acesso." });
  });

  it("marca acesso como perdido e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const criado = await registrarAcesso(
      { pacienteId, tipo: "FISTULA", localizacao: "MSD", dataConfeccao: new Date("2019-03-01") },
      autor.id,
    );
    if (!criado.ok) throw new Error("falhou");
    const r = await marcarAcessoPerdido(criado.id, autor.id);
    expect(r.ok).toBe(true);
    const acessos = await listarAcessos(pacienteId);
    expect(acessos[0].situacao).toBe("PERDIDO");
  });

  it("lista acessos do mais novo para o mais antigo", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    await registrarAcesso({ pacienteId, tipo: "CATETER", localizacao: "Jugular", dataConfeccao: new Date("2018-01-01") }, autor.id);
    await registrarAcesso({ pacienteId, tipo: "FISTULA", localizacao: "MSE", dataConfeccao: new Date("2022-01-01") }, autor.id);
    const acessos = await listarAcessos(pacienteId);
    expect(acessos.map((a) => a.localizacao)).toEqual(["MSE", "Jugular"]);
  });
});
