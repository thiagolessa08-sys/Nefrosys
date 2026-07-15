import { describe, it, expect, beforeEach } from "vitest";
import { criarPaciente, atualizarIdentificacao, atualizarNefrologicos, mudarSituacao } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

const DADOS_VALIDOS = {
  nome: "Maria da Silva",
  cpf: "529.982.247-25",
  cns: "144082627300006",
  dataNascimento: new Date("1960-05-10"),
  sexo: "FEMININO" as const,
  tipoVinculo: "SUS" as const,
};

describe("servico de pacientes", () => {
  beforeEach(limparBanco);

  it("cria paciente com CPF normalizado e audita", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente(DADOS_VALIDOS, autor.id);
    expect(resultado.ok).toBe(true);
    const paciente = await db.paciente.findFirst();
    expect(paciente?.cpf).toBe("52998224725"); // guardado sem pontuação
    expect(paciente?.situacao).toBe("ATIVO");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.criar" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita CPF inválido", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cpf: "52998224724" }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "CPF inválido." });
  });

  it("rejeita CNS inválido", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cns: "144082627300005" }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "CNS inválido." });
  });

  it("aceita paciente sem CNS", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cns: undefined }, autor.id);
    expect(resultado.ok).toBe(true);
  });

  it("rejeita nome vazio", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, nome: "   " }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "Informe o nome." });
  });

  it("rejeita CPF duplicado", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    await criarPaciente(DADOS_VALIDOS, autor.id);
    const resultado = await criarPaciente({ ...DADOS_VALIDOS, cns: undefined }, autor.id);
    expect(resultado).toEqual({ ok: false, erro: "Já existe paciente com este CPF." });
  });

  it("exige convênio quando o vínculo é CONVENIO", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const resultado = await criarPaciente(
      { ...DADOS_VALIDOS, tipoVinculo: "CONVENIO", convenioNome: "  " },
      autor.id,
    );
    expect(resultado).toEqual({ ok: false, erro: "Informe o nome do convênio." });
  });

  it("atualiza identificação e audita", async () => {
    const autor = await criarUsuarioTeste({ perfil: "RECEPCAO", email: "recep@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");
    const resultado = await atualizarIdentificacao(criado.id, { ...DADOS_VALIDOS, nome: "Maria Silva Souza" }, autor.id);
    expect(resultado.ok).toBe(true);
    const paciente = await db.paciente.findUnique({ where: { id: criado.id } });
    expect(paciente?.nome).toBe("Maria Silva Souza");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.atualizar_identificacao" } });
    expect(eventos).toHaveLength(1);
  });

  it("atualiza dados nefrológicos e audita", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");
    const resultado = await atualizarNefrologicos(
      criado.id,
      { cidDoencaBase: "N18.5", dataInicioDialise: new Date("2020-03-01"), modalidade: "HEMODIALISE" },
      autor.id,
    );
    expect(resultado.ok).toBe(true);
    const paciente = await db.paciente.findUnique({ where: { id: criado.id } });
    expect(paciente?.modalidade).toBe("HEMODIALISE");
    expect(paciente?.cidDoencaBase).toBe("N18.5");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.atualizar_nefrologicos" } });
    expect(eventos).toHaveLength(1);
  });

  it("muda situação registrando histórico com origem, destino e motivo", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");

    const resultado = await mudarSituacao(criado.id, "TRANSPLANTADO", "Transplante realizado no HC", autor.id);
    expect(resultado.ok).toBe(true);

    const paciente = await db.paciente.findUnique({ where: { id: criado.id } });
    expect(paciente?.situacao).toBe("TRANSPLANTADO");

    const historico = await db.mudancaSituacao.findMany({ where: { pacienteId: criado.id } });
    expect(historico).toHaveLength(1);
    expect(historico[0].de).toBe("ATIVO");
    expect(historico[0].para).toBe("TRANSPLANTADO");
    expect(historico[0].motivo).toBe("Transplante realizado no HC");
    expect(historico[0].registradoPorId).toBe(autor.id);
  });

  it("não registra histórico quando a situação não muda", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
    const criado = await criarPaciente(DADOS_VALIDOS, autor.id);
    if (!criado.ok) throw new Error("falhou ao criar");
    const resultado = await mudarSituacao(criado.id, "ATIVO", "sem mudança", autor.id);
    expect(resultado).toEqual({ ok: false, erro: "O paciente já está nesta situação." });
    expect(await db.mudancaSituacao.count()).toBe(0);
  });
});
