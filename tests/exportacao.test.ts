import { describe, it, expect } from "vitest";
import { linhasParaExcel, CABECALHO_EXCEL } from "@/lib/pacientes/exportacao";
import type { Paciente } from "@prisma/client";

function paciente(over: Partial<Paciente>): Paciente {
  return {
    id: "1", nome: "Ana Souza", cpf: "52998224725", cns: null,
    dataNascimento: new Date("1960-05-10"), sexo: "FEMININO",
    telefone: null, emailContato: null, logradouro: null, numero: null, complemento: null,
    bairro: null, cidade: null, uf: null, cep: null,
    contatoEmergenciaNome: null, contatoEmergenciaTelefone: null,
    tipoVinculo: "SUS", convenioNome: null, convenioMatricula: null, convenioValidade: null,
    cidDoencaBase: null, dataInicioDialise: null, modalidade: "HEMODIALISE", situacao: "ATIVO",
    fotoDocumentoId: null, criadoEm: new Date(), atualizadoEm: new Date(),
    ...over,
  } as Paciente;
}

describe("exportação para Excel", () => {
  it("cabeçalho tem as colunas esperadas", () => {
    expect(CABECALHO_EXCEL).toEqual(["Nome", "CPF", "Nascimento", "Modalidade", "Vínculo", "Situação"]);
  });

  it("formata uma linha com CPF pontuado e rótulos em português", () => {
    const linhas = linhasParaExcel([paciente({ nome: "Ana Souza" })]);
    expect(linhas[0]).toEqual([
      "Ana Souza", "529.982.247-25", "10/05/1960", "Hemodiálise", "SUS", "Ativo",
    ]);
  });

  it("mostra o convênio no lugar de SUS quando é convênio", () => {
    const linhas = linhasParaExcel([
      paciente({ tipoVinculo: "CONVENIO", convenioNome: "Unimed", modalidade: null }),
    ]);
    expect(linhas[0][3]).toBe("—"); // modalidade nula
    expect(linhas[0][4]).toBe("Unimed");
  });
});
