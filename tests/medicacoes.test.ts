import { describe, it, expect, beforeEach } from "vitest";
import {
  adicionarMedicacao, suspenderMedicacao, medicacoesAtivas,
  adicionarAlergia, removerAlergia, listarAlergias,
} from "@/lib/pacientes/medicacoes";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

async function pacienteEautor() {
  const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
  const criado = await criarPaciente(PACIENTE, autor.id);
  if (!criado.ok) throw new Error("falhou");
  return { autor, pacienteId: criado.id };
}

describe("medicações", () => {
  beforeEach(limparBanco);

  it("adiciona medicação ativa e audita", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarMedicacao({ pacienteId, nome: "Losartana", dose: "50mg", posologia: "1x/dia" }, autor.id);
    expect(r.ok).toBe(true);
    const ativas = await medicacoesAtivas(pacienteId);
    expect(ativas).toHaveLength(1);
    expect(ativas[0].nome).toBe("Losartana");
  });

  it("rejeita nome de medicação vazio", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarMedicacao({ pacienteId, nome: "  " }, autor.id);
    expect(r).toEqual({ ok: false, erro: "Informe o nome da medicação." });
  });

  it("suspender remove da lista de ativas mas mantém o registro", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const criada = await adicionarMedicacao({ pacienteId, nome: "Sevelamer" }, autor.id);
    if (!criada.ok) throw new Error("falhou");
    await suspenderMedicacao(criada.id, autor.id);
    expect(await medicacoesAtivas(pacienteId)).toHaveLength(0);
  });
});

describe("alergias", () => {
  beforeEach(limparBanco);

  it("adiciona e lista alergia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarAlergia({ pacienteId, descricao: "Penicilina" }, autor.id);
    expect(r.ok).toBe(true);
    const alergias = await listarAlergias(pacienteId);
    expect(alergias).toHaveLength(1);
    expect(alergias[0].descricao).toBe("Penicilina");
  });

  it("rejeita descrição vazia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const r = await adicionarAlergia({ pacienteId, descricao: " " }, autor.id);
    expect(r).toEqual({ ok: false, erro: "Descreva a alergia." });
  });

  it("remove alergia", async () => {
    const { autor, pacienteId } = await pacienteEautor();
    const criada = await adicionarAlergia({ pacienteId, descricao: "Contraste iodado" }, autor.id);
    if (!criada.ok) throw new Error("falhou");
    await removerAlergia(criada.id, autor.id);
    expect(await listarAlergias(pacienteId)).toHaveLength(0);
  });
});
