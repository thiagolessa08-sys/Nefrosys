import { describe, it, expect, beforeEach } from "vitest";
import {
  abrirRascunho,
  salvarRascunho,
  assinarEvolucao,
  adicionarAdendo,
  listarEvolucoes,
} from "@/lib/pacientes/evolucoes";
import { criarPaciente } from "@/lib/pacientes/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

const PACIENTE = {
  nome: "Ana Souza",
  cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"),
  sexo: "FEMININO" as const,
  tipoVinculo: "SUS" as const,
};

async function cenario() {
  const medico = await criarUsuarioTeste({ perfil: "MEDICO", email: "med@clinica.local" });
  const criado = await criarPaciente(PACIENTE, medico.id);
  if (!criado.ok) throw new Error("falhou");
  return { medico, pacienteId: criado.id };
}

describe("serviço de evoluções", () => {
  beforeEach(limparBanco);

  it("abrir rascunho cria uma evolução não assinada com o template", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ev = await db.evolucao.findUnique({ where: { id: r.id } });
    expect(ev?.assinadaEm).toBeNull();
    expect(ev?.texto.length).toBeGreaterThan(0);
  });

  it("abrir rascunho reusa o rascunho aberto do mesmo autor e tipo", async () => {
    const { medico, pacienteId } = await cenario();
    const a = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    const b = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    expect(a.ok && b.ok && a.id === b.id).toBe(true);
    expect(await db.evolucao.count()).toBe(1);
  });

  it("salvar rascunho atualiza o texto", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "Paciente estável, sem intercorrências.", medico.id);
    const ev = await db.evolucao.findUnique({ where: { id: r.id } });
    expect(ev?.texto).toBe("Paciente estável, sem intercorrências.");
  });

  it("não salva rascunho de outro autor", async () => {
    const { medico, pacienteId } = await cenario();
    const outro = await criarUsuarioTeste({ perfil: "MEDICO", email: "outro@clinica.local" });
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    const res = await salvarRascunho(r.id, "invasão", outro.id);
    expect(res).toEqual({ ok: false, erro: "Você só pode editar seus próprios rascunhos." });
  });

  it("assinar exige texto não vazio", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "   ", medico.id);
    const res = await assinarEvolucao(r.id, medico.id);
    expect(res).toEqual({ ok: false, erro: "A evolução está vazia." });
  });

  it("assinar torna a evolução imutável e audita", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "Conduta mantida.", medico.id);
    const res = await assinarEvolucao(r.id, medico.id);
    expect(res.ok).toBe(true);
    const ev = await db.evolucao.findUnique({ where: { id: r.id } });
    expect(ev?.assinadaEm).not.toBeNull();
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "paciente.evolucao.assinar" } });
    expect(eventos).toHaveLength(1);
    const depois = await salvarRascunho(r.id, "tentativa de edição", medico.id);
    expect(depois).toEqual({ ok: false, erro: "Evolução assinada não pode ser editada." });
  });

  it("adendo só em evolução assinada, e fica registrado", async () => {
    const { medico, pacienteId } = await cenario();
    const r = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!r.ok) throw new Error("falhou");
    await salvarRascunho(r.id, "Evolução inicial.", medico.id);

    const cedo = await adicionarAdendo(r.id, "não pode ainda", medico.id);
    expect(cedo).toEqual({ ok: false, erro: "Só evolução assinada aceita adendo." });

    await assinarEvolucao(r.id, medico.id);
    const res = await adicionarAdendo(r.id, "Correção: PA aferida às 14h.", medico.id);
    expect(res.ok).toBe(true);
    const adendos = await db.adendo.findMany({ where: { evolucaoId: r.id } });
    expect(adendos).toHaveLength(1);
    expect(adendos[0].texto).toBe("Correção: PA aferida às 14h.");
  });

  it("linha do tempo traz só assinadas, mais recente primeiro, com adendos", async () => {
    const { medico, pacienteId } = await cenario();
    const rascunho = await abrirRascunho(pacienteId, "MEDICA", medico.id);
    if (!rascunho.ok) throw new Error("falhou");
    let linha = await listarEvolucoes(pacienteId);
    expect(linha).toHaveLength(0);

    await salvarRascunho(rascunho.id, "Primeira evolução.", medico.id);
    await assinarEvolucao(rascunho.id, medico.id);
    await adicionarAdendo(rascunho.id, "Adendo à primeira.", medico.id);

    linha = await listarEvolucoes(pacienteId);
    expect(linha).toHaveLength(1);
    expect(linha[0].texto).toBe("Primeira evolução.");
    expect(linha[0].adendos).toHaveLength(1);
  });
});
