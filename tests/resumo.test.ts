import { describe, it, expect, beforeEach } from "vitest";
import { montarResumo } from "@/lib/pacientes/resumo";
import { criarPaciente } from "@/lib/pacientes/servico";
import { registrarAcesso, marcarAcessoPerdido } from "@/lib/pacientes/acessos";
import { registrarSorologia } from "@/lib/pacientes/sorologias";
import { adicionarMedicacao, adicionarAlergia } from "@/lib/pacientes/medicacoes";
import { criarUsuarioTeste, limparBanco } from "./ajuda";

const PACIENTE = {
  nome: "Ana Souza", cpf: "529.982.247-25",
  dataNascimento: new Date("1960-05-10"), sexo: "FEMININO" as const, tipoVinculo: "SUS" as const,
};

describe("resumo do paciente", () => {
  beforeEach(limparBanco);

  it("devolve null quando o paciente não existe", async () => {
    expect(await montarResumo("nao-existe")).toBeNull();
  });

  it("reúne acesso atual, sorologias, medicações ativas e alergias", async () => {
    // 9 chamadas sequenciais ao banco remoto (Railway) — perto do orçamento global de 15s; timeout dedicado.
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const criado = await criarPaciente(PACIENTE, autor.id);
    if (!criado.ok) throw new Error("falhou");
    const id = criado.id;

    const antigo = await registrarAcesso({ pacienteId: id, tipo: "CATETER", localizacao: "Jugular", dataConfeccao: new Date("2019-01-01") }, autor.id);
    if (!antigo.ok) throw new Error("falhou");
    await marcarAcessoPerdido(antigo.id, autor.id);
    await registrarAcesso({ pacienteId: id, tipo: "FISTULA", localizacao: "MSE radiocefálica", dataConfeccao: new Date("2022-01-01") }, autor.id);

    await registrarSorologia({ pacienteId: id, tipo: "HBSAG", resultado: "NEGATIVO", dataExame: new Date("2024-01-01") }, autor.id);
    await adicionarMedicacao({ pacienteId: id, nome: "Losartana", dose: "50mg" }, autor.id);
    await adicionarAlergia({ pacienteId: id, descricao: "Penicilina" }, autor.id);

    const resumo = await montarResumo(id);
    expect(resumo).not.toBeNull();
    expect(resumo!.paciente.nome).toBe("Ana Souza");
    expect(resumo!.acessoAtual?.localizacao).toBe("MSE radiocefálica"); // o EM_USO mais recente
    expect(resumo!.sorologias.HBSAG?.resultado).toBe("NEGATIVO");
    expect(resumo!.medicacoesAtivas).toHaveLength(1);
    expect(resumo!.alergias).toHaveLength(1);
  }, 30000);

  it("acessoAtual é null quando todos os acessos foram perdidos", async () => {
    const autor = await criarUsuarioTeste({ perfil: "MEDICO", email: "m@clinica.local" });
    const criado = await criarPaciente(PACIENTE, autor.id);
    if (!criado.ok) throw new Error("falhou");
    const acesso = await registrarAcesso({ pacienteId: criado.id, tipo: "FISTULA", localizacao: "MSD", dataConfeccao: new Date("2020-01-01") }, autor.id);
    if (!acesso.ok) throw new Error("falhou");
    await marcarAcessoPerdido(acesso.id, autor.id);
    const resumo = await montarResumo(criado.id);
    expect(resumo!.acessoAtual).toBeNull();
  });
});
