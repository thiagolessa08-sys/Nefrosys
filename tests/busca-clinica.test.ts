import { describe, it, expect, beforeEach } from "vitest";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { criarPaciente } from "@/lib/pacientes/servico";
import { registrarAcesso } from "@/lib/pacientes/acessos";
import { registrarSorologia } from "@/lib/pacientes/sorologias";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

describe("busca com filtros clínicos", () => {
  beforeEach(limparBanco);

  it("filtra por sorologia positiva de um tipo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const a = await criarPaciente({ nome: "Positivo HCV", cpf: "529.982.247-25", dataNascimento: new Date("1960-01-01"), sexo: "FEMININO", tipoVinculo: "SUS" }, autor.id);
    const b = await criarPaciente({ nome: "Negativo", cpf: "168.995.350-09", dataNascimento: new Date("1970-01-01"), sexo: "MASCULINO", tipoVinculo: "SUS" }, autor.id);
    if (!a.ok || !b.ok) throw new Error("falhou");
    await registrarSorologia({ pacienteId: a.id, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2024-01-01") }, autor.id);
    await registrarSorologia({ pacienteId: b.id, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2024-01-01") }, autor.id);

    const encontrados = await buscarPacientes({ sorologiaPositiva: "ANTI_HCV" });
    expect(encontrados.map((p) => p.nome)).toEqual(["Positivo HCV"]);
  });

  it("usa a sorologia mais recente: negativou deixa de aparecer como positivo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const a = await criarPaciente({ nome: "Tratado", cpf: "529.982.247-25", dataNascimento: new Date("1960-01-01"), sexo: "FEMININO", tipoVinculo: "SUS" }, autor.id);
    if (!a.ok) throw new Error("falhou");
    await registrarSorologia({ pacienteId: a.id, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2022-01-01") }, autor.id);
    await registrarSorologia({ pacienteId: a.id, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2024-01-01") }, autor.id);
    expect(await buscarPacientes({ sorologiaPositiva: "ANTI_HCV" })).toHaveLength(0);
  });

  it("filtra por tipo de acesso em uso", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const a = await criarPaciente({ nome: "Com fístula", cpf: "529.982.247-25", dataNascimento: new Date("1960-01-01"), sexo: "FEMININO", tipoVinculo: "SUS" }, autor.id);
    const b = await criarPaciente({ nome: "Com cateter", cpf: "168.995.350-09", dataNascimento: new Date("1970-01-01"), sexo: "MASCULINO", tipoVinculo: "SUS" }, autor.id);
    if (!a.ok || !b.ok) throw new Error("falhou");
    await registrarAcesso({ pacienteId: a.id, tipo: "FISTULA", localizacao: "MSE", dataConfeccao: new Date("2022-01-01") }, autor.id);
    await registrarAcesso({ pacienteId: b.id, tipo: "CATETER", localizacao: "Jugular", dataConfeccao: new Date("2023-01-01") }, autor.id);

    const encontrados = await buscarPacientes({ tipoAcesso: "FISTULA" });
    expect(encontrados.map((p) => p.nome)).toEqual(["Com fístula"]);
  });
});
