import { describe, it, expect, beforeEach } from "vitest";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

async function semear(autorId: string) {
  await criarPaciente(
    {
      nome: "Ana Souza", cpf: "529.982.247-25", cns: "144082627300006",
      dataNascimento: new Date("1960-05-10"), sexo: "FEMININO", tipoVinculo: "SUS",
    },
    autorId,
  );
  await criarPaciente(
    {
      nome: "Bruno Lima", cpf: "168.995.350-09",
      dataNascimento: new Date("1975-02-20"), sexo: "MASCULINO",
      tipoVinculo: "CONVENIO", convenioNome: "Unimed",
    },
    autorId,
  );
}

describe("busca de pacientes", () => {
  beforeEach(limparBanco);

  it("lista todos ordenados por nome quando não há filtro", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({});
    expect(encontrados.map((p) => p.nome)).toEqual(["Ana Souza", "Bruno Lima"]);
  });

  it("busca por parte do nome, sem diferenciar maiúsculas", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ texto: "bru" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Bruno Lima");
  });

  it("busca por CPF mesmo digitado com pontuação", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ texto: "529.982.247-25" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Ana Souza");
  });

  it("busca por CNS", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ texto: "144082627300006" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Ana Souza");
  });

  it("filtra por tipo de vínculo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const encontrados = await buscarPacientes({ tipoVinculo: "CONVENIO" });
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe("Bruno Lima");
  });

  it("filtra por situação", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    const ativos = await buscarPacientes({ situacao: "ATIVO" });
    expect(ativos).toHaveLength(2);
    const obitos = await buscarPacientes({ situacao: "OBITO" });
    expect(obitos).toHaveLength(0);
  });

  it("não retorna nada para texto sem correspondência", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "r@clinica.local" });
    await semear(autor.id);
    expect(await buscarPacientes({ texto: "zzzz" })).toHaveLength(0);
  });
});
